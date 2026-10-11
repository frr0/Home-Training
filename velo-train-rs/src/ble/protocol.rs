use uuid::Uuid;

// Standard Bluetooth SIG 16-bit UUID expansions
pub const FTMS_SERVICE: Uuid = Uuid::from_u128(0x00001826_0000_1000_8000_00805F9B34FB);
pub const CYCLING_POWER_SERVICE: Uuid = Uuid::from_u128(0x00001818_0000_1000_8000_00805F9B34FB);
pub const CSC_SERVICE: Uuid = Uuid::from_u128(0x00001816_0000_1000_8000_00805F9B34FB);
pub const HEART_RATE_SERVICE: Uuid = Uuid::from_u128(0x0000180D_0000_1000_8000_00805F9B34FB);

// Characteristics
pub const INDOOR_BIKE_DATA_CHAR: Uuid = Uuid::from_u128(0x00002AD2_0000_1000_8000_00805F9B34FB);
pub const FTMS_CONTROL_POINT_CHAR: Uuid = Uuid::from_u128(0x00002AD9_0000_1000_8000_00805F9B34FB);
pub const CYCLING_POWER_MEASUREMENT_CHAR: Uuid = Uuid::from_u128(0x00002A63_0000_1000_8000_00805F9B34FB);
pub const CSC_MEASUREMENT_CHAR: Uuid = Uuid::from_u128(0x00002A5B_0000_1000_8000_00805F9B34FB);
pub const HEART_RATE_MEASUREMENT_CHAR: Uuid = Uuid::from_u128(0x00002A37_0000_1000_8000_00805F9B34FB);

#[derive(Debug, Clone, Default)]
pub struct TelemetrySnapshot {
    pub power_watts: Option<i16>,
    pub cadence_rpm: Option<u16>,
    pub heart_rate_bpm: Option<u8>,
    pub speed_kmh: Option<f32>,
    pub target_watts: u16,
}

/// Decodes FTMS Indoor Bike Data (0x2AD2)
pub fn parse_ftms_bike_data(raw: &[u8]) -> Option<(Option<i16>, Option<u16>, Option<f32>)> {
    if raw.len() < 2 {
        return None;
    }

    let flags = u16::from_le_bytes([raw[0], raw[1]]);
    let mut offset = 2;

    let mut speed = None;
    let mut cadence = None;
    let mut power = None;

    // Bit 0: More Data. 0 = Instantaneous Speed Present (0.01 km/h)
    if (flags & 0x0001) == 0 && raw.len() >= offset + 2 {
        let raw_spd = u16::from_le_bytes([raw[offset], raw[offset + 1]]);
        speed = Some(raw_spd as f32 * 0.01);
        offset += 2;
    }

    // Bit 1: Average Speed Present
    if (flags & 0x0002) != 0 {
        offset += 2;
    }

    // Bit 2: Instantaneous Cadence Present (0.5 RPM)
    if (flags & 0x0004) != 0 && raw.len() >= offset + 2 {
        let raw_cad = u16::from_le_bytes([raw[offset], raw[offset + 1]]);
        cadence = Some(raw_cad / 2);
        offset += 2;
    }

    // Bit 3: Average Cadence Present
    if (flags & 0x0008) != 0 {
        offset += 2;
    }

    // Bit 4: Total Distance (uint24)
    if (flags & 0x0010) != 0 {
        offset += 3;
    }

    // Bit 5: Resistance Level (sint16)
    if (flags & 0x0020) != 0 {
        offset += 2;
    }

    // Bit 6: Instantaneous Power (sint16)
    if (flags & 0x0040) != 0 && raw.len() >= offset + 2 {
        let raw_pwr = i16::from_le_bytes([raw[offset], raw[offset + 1]]);
        power = Some(raw_pwr.max(0));
    }

    Some((power, cadence, speed))
}

/// Decodes Cycling Power Measurement (0x2A63)
pub fn parse_cycling_power(raw: &[u8]) -> Option<i16> {
    if raw.len() < 4 {
        return None;
    }
    let pwr = i16::from_le_bytes([raw[2], raw[3]]);
    Some(pwr.max(0))
}

/// Decodes Heart Rate Measurement (0x2A37)
pub fn parse_heart_rate(raw: &[u8]) -> Option<u8> {
    if raw.len() < 2 {
        return None;
    }
    let flags = raw[0];
    if (flags & 0x01) == 0 {
        Some(raw[1])
    } else if raw.len() >= 3 {
        Some(u16::from_le_bytes([raw[1], raw[2]]).min(255) as u8)
    } else {
        None
    }
}

/// Manages Crank Event Cadence calculation with 16-bit rollover
#[derive(Default)]
pub struct CadenceCalculator {
    last_crank_revs: Option<u16>,
    last_event_time: Option<u16>,
}

impl CadenceCalculator {
    pub fn update(&mut self, raw: &[u8]) -> Option<u16> {
        if raw.is_empty() {
            return None;
        }
        let flags = raw[0];
        let mut offset = 1;

        // Skip wheel data if present (6 bytes)
        if (flags & 0x01) != 0 {
            offset += 6;
        }

        // Crank revolution present (uint16 revs + uint16 time at 1/1024s)
        if (flags & 0x02) != 0 && raw.len() >= offset + 4 {
            let revs = u16::from_le_bytes([raw[offset], raw[offset + 1]]);
            let event_time = u16::from_le_bytes([raw[offset + 2], raw[offset + 3]]);

            let calculated_cadence = if let (Some(l_revs), Some(l_time)) = (self.last_crank_revs, self.last_event_time) {
                let d_revs = revs.wrapping_sub(l_revs);
                let d_time = event_time.wrapping_sub(l_time);

                if d_time > 0 && d_revs > 0 {
                    let dt_sec = d_time as f32 / 1024.0;
                    Some(((d_revs as f32 / dt_sec) * 60.0).round() as u16)
                } else {
                    None
                }
            } else {
                None
            };

            self.last_crank_revs = Some(revs);
            self.last_event_time = Some(event_time);
            calculated_cadence
        } else {
            None
        }
    }
}

/// FTMS Control Point Command Builder
pub struct FtmsControl;

impl FtmsControl {
    /// OpCode 0x00: Request Control
    pub fn request_control() -> Vec<u8> {
        vec![0x00]
    }

    /// OpCode 0x05: Set Target Power (ERG Mode)
    pub fn set_target_power(watts: u16) -> Vec<u8> {
        let bytes = watts.to_le_bytes();
        vec![0x05, bytes[0], bytes[1]]
    }
}
