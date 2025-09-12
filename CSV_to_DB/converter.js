import fs from "fs";
import csv from "csv-parser";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";

// ---- CONFIG ----
const CSV_FILE = "DMR_rpt_sr.csv"; // your CSV file
const COLOR = "red";            // default color
const TYPE = "DMR";             // default type
// ----------------

// Firebase config from your snippet
const firebaseConfig = {
  apiKey: "AIzaSyDrrk8HnmLTE8BfGIp4qog0pRVDgiM1xAM",
  authDomain: "radiosignaldb.firebaseapp.com",
  databaseURL: "https://radiosignaldb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "radiosignaldb",
  storageBucket: "radiosignaldb.firebasestorage.app",
  messagingSenderId: "710694962829",
  appId: "1:710694962829:web:91848c520db09eb90b84c4",
  measurementId: "G-RRJFQXCGVC"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Function for timestamp in ms
function getTimestamp() {
  return Date.now();
}

let signals = [];

// Parse CSV
fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on("data", (row) => {
    try {
      let signal = {
        city: row["QTH"].trim(),
        color: COLOR,
        description: row["Nazwa"].trim(),
        frequency: parseFloat(row["Tx"]),
        lat: parseFloat(row["Latitude"]),
        lon: parseFloat(row["Longitute"]),
        radius_km: 20,
        timestamp: getTimestamp(),
        type: TYPE
      };
      signals.push(signal);
    } catch (err) {
      console.error("Error parsing row:", row, err);
    }
  })
  .on("end", async () => {
    console.log("=== Preview of converted data ===");
    console.table(signals);

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Do you want to upload this to Firebase? (y/n): ", async (answer) => {
      if (answer.toLowerCase() !== "y") {
        console.log("Aborted by user.");
        rl.close();
        return;
      }

      console.log("\nUploading...");
      for (const s of signals) {
        await push(ref(db, "signals"), s);
        console.log(`Uploaded: ${s.description} (${s.frequency})`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
      }

      console.log("✅ Done!");
      rl.close();
    });
  });
