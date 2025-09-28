import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

// --- ESM version of __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Interface for type safety ---
interface ChartDataPoint {
  year: string;
  value: number;
}

// --- Initialize Express App ---
const app = express();
const port = 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Route ---
app.get('/api/data', (req: Request, res: Response) => {
  // console.log('--- /api/data endpoint called ---');

  const { company, metric } = req.query;

  if (!company || !metric) {
    return res
      .status(400)
      .json({ error: 'Company and metric query parameters are required.' });
  }

  try {
    const filePath = path.join(__dirname, '../data/data.xls');
    console.log('Reading Excel file from:', filePath);

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // --- Parse as JSON (headers from first row are used as keys) ---
    const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length == 0) {
      console.log('No data found in the Excel sheet.');
    }


    // console.log('Row count:', jsonData.length);
    // if (jsonData.length > 0) {
    //   console.log('Parsed row sample:', jsonData[0]);
    // }


    // const availableTickers = [...new Set(jsonData.map(r => `"${r['Ticker']}"`))];
    // const availableFields = [...new Set(jsonData.map(r => `"${r['Field']}"`))];
    // console.log('Available Tickers:', availableTickers);
    // console.log('Available Fields:', availableFields);


    // if (jsonData.length > 0) {
    //   console.log('Parsed headers:', Object.keys(jsonData[0]));
    // }

    const normalize = (val: any) =>
      val ? val.toString().trim().toLowerCase() : '';

    // console.log(
    //   `Searching for Company: ${normalize(company)}, Metric: ${normalize(metric)}`
    // );

    // --- FIX: Match against 'Ticker' and 'Field' ---
    const targetRow = jsonData.find(
      (row) =>
        normalize(row['Ticker']) === normalize(company) &&
        normalize(row['Field']) === normalize(metric)
    );

    if (!targetRow) {
      console.warn(
        `No data found for Company: ${company}, Metric: ${metric}`
      );
      // const availableTickers = [...new Set(jsonData.map((r) => r['Ticker']))];
      // const availableFields = [...new Set(jsonData.map((r) => r['Field']))];
      // console.log('Available Tickers:', availableTickers);
      // console.log('Available Fields:', availableFields);
      return res
        .status(404)
        .json({ error: 'Data not found for the selected criteria.' });
    }

    console.log('Found target row:', targetRow);

    // --- Build chart data using only year keys ---
    const chartData: ChartDataPoint[] = Object.keys(targetRow)
      .filter((key) => /^\d{4}$/.test(key)) // only 4-digit years
      .map((year) => ({
        year,
        value: Number(targetRow[year]),
      }));

    return res.json(chartData);
  } catch (error) {
    console.error('Error processing file:', error);
    return res
      .status(500)
      .json({ error: 'Failed to read or process the data file.' });
  }
});

// --- Start the server ---
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:5000");
});

