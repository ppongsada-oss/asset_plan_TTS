import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  // Define the CSV header matching the database schema
  const csvHeaders = "item_code,name,category,sub_category,unit,buy_price,rent_price,lead_time\n";
  
  // Provide 2 mock lines as example format
  const mockLine1 = "TC-001,Tower Crane 8t,A (เครื่องจักร),A1,ตัว,2500000,150000,30 Days\n";
  const mockLine2 = "HM-022,High-Pressure Pump,A (เครื่องจักร),A3,เครื่อง,500000,45000,15 Days\n";

  const csvContent = csvHeaders + mockLine1 + mockLine2;

  // Return as a downloadable file
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="equipment_template.csv"',
    },
  });
}
