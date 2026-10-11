use crate::ble::protocol::*;
use btleplug::api::{
    Central, Characteristic, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::{Manager, Peripheral};
use futures_util::StreamExt;
use std::collections::HashSet;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{info, warn};

#[derive(Debug, Clone)]
pub enum BleEvent {
    TrainerConnected(String),
    HeartRateConnected(String),
    CadenceConnected(String),
    PowerUpdated(i16),
    CadenceUpdated(u16),
    HeartRateUpdated(u8),
    SpeedUpdated(f32),
    Error(String),
}

#[derive(Debug, Clone)]
pub enum BleCommand {
    SetTargetPower(u16),
}

pub struct BleService {
    event_tx: mpsc::Sender<BleEvent>,
    cmd_rx: mpsc::Receiver<BleCommand>,
    ftms_control_char: Option<(Peripheral, Characteristic)>,
}

impl BleService {
    pub fn spawn(
        event_tx: mpsc::Sender<BleEvent>,
        cmd_rx: mpsc::Receiver<BleCommand>,
    ) {
        tokio::spawn(async move {
            let mut service = Self {
                event_tx,
                cmd_rx,
                ftms_control_char: None,
            };
            service.run().await;
        });
    }

    async fn run(&mut self) {
        let manager = match Manager::new().await {
            Ok(m) => m,
            Err(e) => {
                let _ = self.event_tx.send(BleEvent::Error(format!("D-Bus Manager Error: {e}"))).await;
                return;
            }
        };

        let adapters = match manager.adapters().await {
            Ok(a) if !a.is_empty() => a,
            _ => {
                let _ = self.event_tx.send(BleEvent::Error("No BlueZ BLE adapter found. Check Bluetooth daemon.".into())).await;
                return;
            }
        };

        let central = adapters.into_iter().next().unwrap();
        info!("Scanning on BlueZ Adapter: {:?}", central.adapter_info().await);

        if let Err(e) = central.start_scan(ScanFilter::default()).await {
            let _ = self.event_tx.send(BleEvent::Error(format!("Start scan failed: {e}"))).await;
            return;
        }

        let mut discovered = HashSet::new();

        loop {
            tokio::select! {
                // Handle outbound commands from GUI (e.g. Set Target Power)
                Some(cmd) = self.cmd_rx.recv() => {
                    match cmd {
                        BleCommand::SetTargetPower(watts) => {
                            if let Some((ref peripheral, ref charac)) = self.ftms_control_char {
                                let payload = FtmsControl::set_target_power(watts);
                                let _ = peripheral.write(charac, &payload, WriteType::WithResponse).await;
                            }
                        }
                    }
                }

                // Discovery poll loop
                _ = tokio::time::sleep(Duration::from_millis(500)) => {
                    let peripherals = central.peripherals().await.unwrap_or_default();
                    for p in peripherals {
                        let id = p.id();
                        if discovered.contains(&id) {
                            continue;
                        }

                        if let Ok(Some(props)) = p.properties().await {
                            let name = props.local_name.unwrap_or_else(|| "Unknown Sensor".into());
                            let services = props.services;

                            let is_ftms = services.contains(&FTMS_SERVICE);
                            let is_cps = services.contains(&CYCLING_POWER_SERVICE);
                            let is_hr = services.contains(&HEART_RATE_SERVICE);
                            let is_csc = services.contains(&CSC_SERVICE);

                            if is_ftms || is_cps || is_hr || is_csc {
                                discovered.insert(id);
                                info!("Connecting to BLE cycling device: {name}");
                                if let Err(e) = p.connect().await {
                                    warn!("Connection failed to {name}: {e}");
                                    continue;
                                }

                                if let Err(e) = p.discover_services().await {
                                    warn!("Discovery failed on {name}: {e}");
                                    continue;
                                }

                                // Subscribe to characteristics
                                for c in p.characteristics() {
                                    if c.uuid == INDOOR_BIKE_DATA_CHAR {
                                        let _ = p.subscribe(&c).await;
                                        let _ = self.event_tx.send(BleEvent::TrainerConnected(name.clone())).await;
                                    } else if c.uuid == FTMS_CONTROL_POINT_CHAR {
                                        let _ = p.subscribe(&c).await;
                                        let req = FtmsControl::request_control();
                                        let _ = p.write(&c, &req, WriteType::WithResponse).await;
                                        self.ftms_control_char = Some((p.clone(), c.clone()));
                                    } else if c.uuid == CYCLING_POWER_MEASUREMENT_CHAR {
                                        let _ = p.subscribe(&c).await;
                                        let _ = self.event_tx.send(BleEvent::TrainerConnected(name.clone())).await;
                                    } else if c.uuid == HEART_RATE_MEASUREMENT_CHAR {
                                        let _ = p.subscribe(&c).await;
                                        let _ = self.event_tx.send(BleEvent::HeartRateConnected(name.clone())).await;
                                    } else if c.uuid == CSC_MEASUREMENT_CHAR {
                                        let _ = p.subscribe(&c).await;
                                        let _ = self.event_tx.send(BleEvent::CadenceConnected(name.clone())).await;
                                    }
                                }

                                // Stream notifications
                                let event_tx_clone = self.event_tx.clone();
                                let mut notif_stream = match p.notifications().await {
                                    Ok(s) => s,
                                    Err(_) => continue,
                                };

                                tokio::spawn(async move {
                                    let mut cadence_calc = CadenceCalculator::default();
                                    while let Some(notif) = notif_stream.next().await {
                                        match notif.uuid {
                                            INDOOR_BIKE_DATA_CHAR => {
                                                if let Some((pwr, cad, spd)) = parse_ftms_bike_data(&notif.value) {
                                                    if let Some(p) = pwr { let _ = event_tx_clone.send(BleEvent::PowerUpdated(p)).await; }
                                                    if let Some(c) = cad { let _ = event_tx_clone.send(BleEvent::CadenceUpdated(c)).await; }
                                                    if let Some(s) = spd { let _ = event_tx_clone.send(BleEvent::SpeedUpdated(s)).await; }
                                                }
                                            }
                                            CYCLING_POWER_MEASUREMENT_CHAR => {
                                                if let Some(p) = parse_cycling_power(&notif.value) {
                                                    let _ = event_tx_clone.send(BleEvent::PowerUpdated(p)).await;
                                                }
                                            }
                                            HEART_RATE_MEASUREMENT_CHAR => {
                                                if let Some(hr) = parse_heart_rate(&notif.value) {
                                                    let _ = event_tx_clone.send(BleEvent::HeartRateUpdated(hr)).await;
                                                }
                                            }
                                            CSC_MEASUREMENT_CHAR => {
                                                if let Some(cad) = cadence_calc.update(&notif.value) {
                                                    let _ = event_tx_clone.send(BleEvent::CadenceUpdated(cad)).await;
                                                }
                                            }
                                            _ => {}
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
    }
}
