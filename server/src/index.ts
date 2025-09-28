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
// --- DEPLOYMENT CHANGE: Use Render's port, with a fallback for local dev ---
const port = process.env.PORT || 5000;

// --- Middleware ---
// Allow requests from any origin. For better security, you could restrict
// this to your Vercel URL in production.
app.use(cors());
app.use(express.json());

// --- API Route ---
app.get('/api/data', (req: Request, res: Response) => {
  const { company, metric } = req.query;

  if (!company || !metric) {
    return res
      .status(400)
      .json({ error: 'Company and metric query parameters are required.' });
  }

  try {
    // This path assumes your 'data' folder is one level above your 'src' folder
    // Project structure should be:
    // /server
    //   /data
    //     - data.xls
    //   /src
    //     - index.ts
    const filePath = path.join(__dirname, '../data/data.xls');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData: any[] = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length == 0) {
      return res.status(404).json({ error: 'No data found in source file.' });
    }

    const normalize = (val: any) =>
      val ? val.toString().trim().toLowerCase() : '';

    const targetRow = jsonData.find(
      (row) =>
        normalize(row['Ticker']) === normalize(company) &&
        normalize(row['Field']) === normalize(metric)
    );

    if (!targetRow) {
      return res
        .status(404)
        .json({ error: 'Data not found for the selected criteria.' });
    }

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
// --- DEPLOYMENT CHANGE: Removed hardcoded "0.0.0.0" and port ---
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});