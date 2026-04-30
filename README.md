# Asset Plan Management System

This project is built using Next.js (App Router), Tailwind CSS, Drizzle ORM, and Cloudflare D1 (Serverless SQLite).

## Running the Project Locally (Frontend + Database)

Thanks to the Cloudflare `next-on-pages` integration, the Database (D1) and the Frontend run simultaneously in the same command. You do not need a separate backend terminal.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. **Access the Application**
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

### Testing the Master Data (T-008 & T-009)
1. Navigate to `/master-data` in your browser.
2. Click **"โหลด Template CSV"** to download the template.
3. Add some test data in Excel/Numbers, save as CSV.
4. Click **"อัปโหลดข้อมูล (Bulk)"** and select your CSV.
5. The table will automatically refresh with the data pulled directly from your local Cloudflare D1 database.
