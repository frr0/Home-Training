# VeloTrain 🚴‍♂️ | Smart Indoor Cycling & Workout Studio

A modern, responsive web application for indoor cycling workouts on smart trainers. Built with React 19, TypeScript, Tailwind CSS, Web Bluetooth API, and Garmin FIT SDK.

---

## 🌟 Key Features

1. **Bluetooth Sensors Connectivity (Web Bluetooth API)**:
   - **Smart Trainer (FTMS & Cycling Power)**: Connects to smart trainers via Bluetooth FTMS (`0x1826`) or Cycling Power (`0x1818`). Reads instantaneous power (W), cadence (RPM), and trainer flywheel speed.
   - **Bluetooth Cadence Sensor**: Dedicated connection for Bluetooth Crank Cadence sensors (Cycling Speed and Cadence Service `0x1816`).
   - **Bluetooth Heart Rate Monitor**: Connects to Bluetooth Heart Rate monitors (`0x180D`) with live BPM and HR zone calculation.
   - **Simulation / Demo Mode**: Built-in realistic virtual cyclist simulation for testing and demonstrations without requiring physical hardware.

2. **Cycling Physics & Velocity Engine**:
   - Calculates instantaneous velocity ($\text{km/h}$, $\text{m/s}$, $\text{mph}$) and accumulated distance using realistic aerodynamic drag, rolling resistance, rider mass, bike mass, and momentum:
     $$F_{drive} = \frac{P_{watts} \cdot \eta}{v}, \quad F_{resist} = 0.5 \cdot \rho \cdot C_d A \cdot v^2 + C_{rr} \cdot m \cdot g$$
   - Supports switching between **Physics Calculated Speed** and **Trainer Hardware Flywheel Speed**.

3. **Zwift Workout (.zwo) Support & ERG Mode Control**:
   - Upload and parse any Zwift `.zwo` XML workout (`<Warmup>`, `<SteadyState>`, `<IntervalsT>`, `<Ramp>`, `<Cooldown>`, `<FreeRide>`, `<MaxEffort>`).
   - Automatically calculates workout profile, Coggan power zones (Z1–Z7), TSS (Training Stress Score), and Intensity Factor (IF).
   - **Trainer Intensity Control (ERG Mode)**: Automatically sends Target Power commands to the smart trainer via FTMS Control Point (`0x2AD9`) as workout intervals progress.
   - **ERG Bias**: Adjust workout intensity on the fly (-20% to +20%).
   - Audio countdown cues (3, 2, 1, interval change synthesizer beeps).

4. **Session Controls**:
   - START, PAUSE, RESUME, and STOP & SAVE buttons.
   - Interval skip forward / backward controls.
   - Manual target power controls (+/- 5W, +/- 10W).

5. **Garmin .FIT File Generation & Export**:
   - Automatically generates a 100% compliant `.fit` binary file upon session completion using `@garmin/fitsdk`.
   - Contains:
     - `FileId` message
     - `Event` messages (timer start/stop)
     - Second-by-second `Record` messages (power, cadence, heart rate, speed, distance)
     - `Lap` message
     - `Session` message (indoor cycling, normalized power, max/avg stats, total work in kJ, calories, TSS, IF)
     - `Activity` message
   - Ready to upload directly to **Strava**, **Garmin Connect**, **Intervals.icu**, and **TrainingPeaks**.

---

## 🚀 Running the App

### 1. Standalone Desktop App (AppImage)

The AppImage bundles the entire rich webapp into a standalone Linux desktop application with full native Web Bluetooth (BlueZ) support, identical UI, Zwift workout parsing, audio cues, physics engine, and .FIT export:

```bash
# Direct execution (double click in file manager, or from terminal):
./VeloTrain-x86_64.AppImage

# Or use the universal launcher:
./run-app.sh
```

*(Note: On Linux systems without legacy `fuse2` installed, run with `./VeloTrain-x86_64.AppImage --appimage-extract-and-run` or use `./run-app.sh` which handles this automatically).*

You can also run the unpacked native desktop binary directly:
```bash
./release/linux-unpacked/velotrain
```

### 2. Browser Mode (Vite Web Server)

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### 3. Rebuilding the AppImage

```bash
npm run dist
```
This re-compiles the webapp and packages the updated `VeloTrain-x86_64.AppImage` into `release/` and your root folder.
