mod ble;

use ble::manager::{BleCommand, BleEvent, BleService};
use ble::protocol::TelemetrySnapshot;
use iced::widget::{button, column, container, row, text};
use iced::{Alignment, Element, Length, Subscription, Theme};
use std::time::Duration;
use tokio::sync::mpsc;

pub fn main() -> iced::Result {
    tracing_subscriber::fmt::init();

    iced::application("VeloTrain | Linux Smart Trainer", VeloTrainApp::update, VeloTrainApp::view)
        .subscription(VeloTrainApp::subscription)
        .theme(VeloTrainApp::theme)
        .window_size(iced::Size::new(820.0, 520.0))
        .run()
}

struct VeloTrainApp {
    telemetry: TelemetrySnapshot,
    sensor_status: String,
    elapsed_seconds: u64,
    distance_meters: f32,
    cmd_tx: Option<mpsc::Sender<BleCommand>>,
}

impl Default for VeloTrainApp {
    fn default() -> Self {
        Self {
            telemetry: TelemetrySnapshot {
                target_watts: 180,
                ..Default::default()
            },
            sensor_status: "Scanning for BLE cycling sensors via BlueZ...".into(),
            elapsed_seconds: 0,
            distance_meters: 0.0,
            cmd_tx: None,
        }
    }
}

#[derive(Debug, Clone)]
enum Message {
    Ready(mpsc::Sender<BleCommand>),
    Ble(BleEvent),
    AdjustTargetWatts(i16),
    Tick,
}

impl VeloTrainApp {
    fn update(&mut self, message: Message) {
        match message {
            Message::Ready(tx) => {
                self.cmd_tx = Some(tx);
            }
            Message::Ble(event) => match event {
                BleEvent::PowerUpdated(w) => self.telemetry.power_watts = Some(w),
                BleEvent::CadenceUpdated(c) => self.telemetry.cadence_rpm = Some(c),
                BleEvent::HeartRateUpdated(hr) => self.telemetry.heart_rate_bpm = Some(hr),
                BleEvent::SpeedUpdated(spd) => self.telemetry.speed_kmh = Some(spd),
                BleEvent::TrainerConnected(name) => self.sensor_status = format!("Trainer: {name}"),
                BleEvent::HeartRateConnected(name) => self.sensor_status = format!("HR: {name}"),
                BleEvent::CadenceConnected(name) => self.sensor_status = format!("Cadence: {name}"),
                BleEvent::Error(err) => self.sensor_status = format!("BLE Error: {err}"),
            },
            Message::AdjustTargetWatts(delta) => {
                let current = self.telemetry.target_watts as i16;
                let next = (current + delta).clamp(50, 600) as u16;
                self.telemetry.target_watts = next;
                if let Some(ref tx) = self.cmd_tx {
                    let _ = tx.try_send(BleCommand::SetTargetPower(next));
                }
            }
            Message::Tick => {
                self.elapsed_seconds += 1;
                let spd = self.telemetry.speed_kmh.unwrap_or(0.0);
                self.distance_meters += (spd / 3.6) * 1.0;
            }
        }
    }

    fn subscription(&self) -> Subscription<Message> {
        let ble_sub = Subscription::run_with_id(
            "ble_sub",
            iced::stream::channel(100, |mut output| async move {
                use futures_util::SinkExt;
                let (event_tx, mut event_rx) = mpsc::channel(100);
                let (cmd_tx, cmd_rx) = mpsc::channel(20);

                let _ = output.send(Message::Ready(cmd_tx)).await;
                BleService::spawn(event_tx, cmd_rx);

                while let Some(evt) = event_rx.recv().await {
                    let _ = output.send(Message::Ble(evt)).await;
                }
            }),
        );

        let tick_sub = iced::time::every(Duration::from_secs(1)).map(|_| Message::Tick);

        Subscription::batch([ble_sub, tick_sub])
    }

    fn view(&self) -> Element<'_, Message> {
        let pwr = self
            .telemetry
            .power_watts
            .map(|v| v.to_string())
            .unwrap_or_else(|| "--".into());
        let cad = self
            .telemetry
            .cadence_rpm
            .map(|v| v.to_string())
            .unwrap_or_else(|| "--".into());
        let hr = self
            .telemetry
            .heart_rate_bpm
            .map(|v| v.to_string())
            .unwrap_or_else(|| "--".into());
        let spd = self
            .telemetry
            .speed_kmh
            .map(|v| format!("{:.1}", v))
            .unwrap_or_else(|| "--.-".into());

        let hours = self.elapsed_seconds / 3600;
        let mins = (self.elapsed_seconds % 3600) / 60;
        let secs = self.elapsed_seconds % 60;
        let elapsed_str = format!("{:02}:{:02}:{:02}", hours, mins, secs);
        let dist_km = format!("{:.2} km", self.distance_meters / 1000.0);

        // Coggan Power Zone indication (based on 250W FTP reference)
        let pwr_color = match self.telemetry.power_watts.unwrap_or(0) {
            0..=137 => iced::Color::from_rgb(0.58, 0.64, 0.72),   // Z1 Recovery
            138..=187 => iced::Color::from_rgb(0.22, 0.74, 0.97), // Z2 Endurance
            188..=225 => iced::Color::from_rgb(0.29, 0.87, 0.50), // Z3 Tempo
            226..=262 => iced::Color::from_rgb(0.98, 0.80, 0.08), // Z4 Threshold
            263..=300 => iced::Color::from_rgb(0.98, 0.57, 0.24), // Z5 VO2 Max
            _ => iced::Color::from_rgb(0.97, 0.44, 0.44),         // Z6 Anaerobic
        };

        // Big Metric Cards
        let pwr_box = container(
            column![
                text("POWER (WATTS)").size(13).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.55, 0.65, 0.75))
                }),
                text(pwr).size(64).style(move |_theme: &Theme| text::Style {
                    color: Some(pwr_color)
                }),
                text(format!("Target: {} W", self.telemetry.target_watts))
                    .size(15)
                    .style(|_theme: &Theme| text::Style {
                        color: Some(iced::Color::from_rgb(0.25, 0.80, 0.95))
                    })
            ]
            .align_x(Alignment::Center),
        )
        .width(Length::FillPortion(1))
        .padding(12);

        let spd_box = container(
            column![
                text("SPEED (KM/H)").size(13).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.55, 0.65, 0.75))
                }),
                text(spd).size(64).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.3, 0.9, 0.4))
                }),
                text(dist_km).size(15).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.7, 0.7, 0.7))
                })
            ]
            .align_x(Alignment::Center),
        )
        .width(Length::FillPortion(1))
        .padding(12);

        let cad_box = container(
            column![
                text("CADENCE (RPM)").size(13).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.55, 0.65, 0.75))
                }),
                text(cad).size(52).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.2, 0.8, 0.95))
                }),
                text("Crank Sensors").size(13).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.5, 0.5, 0.5))
                })
            ]
            .align_x(Alignment::Center),
        )
        .width(Length::FillPortion(1))
        .padding(12);

        let hr_box = container(
            column![
                text("HEART RATE (BPM)").size(13).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.55, 0.65, 0.75))
                }),
                text(hr).size(52).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.95, 0.35, 0.35))
                }),
                text(elapsed_str).size(13).style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.7, 0.7, 0.7))
                })
            ]
            .align_x(Alignment::Center),
        )
        .width(Length::FillPortion(1))
        .padding(12);

        // ERG Stepper Controls
        let erg_controls = row![
            button(text(" - 25W ").size(15)).on_press(Message::AdjustTargetWatts(-25)),
            button(text(" - 5W ").size(15)).on_press(Message::AdjustTargetWatts(-5)),
            text(format!("  ERG Target: {} W  ", self.telemetry.target_watts))
                .size(19)
                .style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.9, 0.85, 0.4))
                }),
            button(text(" + 5W ").size(15)).on_press(Message::AdjustTargetWatts(5)),
            button(text(" + 25W ").size(15)).on_press(Message::AdjustTargetWatts(25)),
        ]
        .spacing(12)
        .align_y(Alignment::Center);

        let content = column![
            text(&self.sensor_status)
                .size(13)
                .style(|_theme: &Theme| text::Style {
                    color: Some(iced::Color::from_rgb(0.4, 0.7, 1.0))
                }),
            row![pwr_box, spd_box].spacing(16),
            row![cad_box, hr_box].spacing(16),
            erg_controls
        ]
        .spacing(18)
        .padding(24)
        .align_x(Alignment::Center);

        container(content)
            .width(Length::Fill)
            .height(Length::Fill)
            .center_x(Length::Fill)
            .center_y(Length::Fill)
            .into()
    }

    fn theme(&self) -> Theme {
        Theme::Dark
    }
}
