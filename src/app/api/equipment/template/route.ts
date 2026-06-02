import { NextResponse } from "next/server";


export async function GET() {
  // Define the CSV header matching the database schema
  const csvHeaders = "item_code,name,category_code,sub_category_code,unit,buy_price,rent_price,lead_time,remaining_stock\n";
  
  // Provide 2 mock lines as example format
  const mockLine1 = "TC-001,Tower Crane 8t,A,A1,ตัว,2500000,150000,30 Days,5\n";
  const mockLine2 = "HM-022,High-Pressure Pump,A,A3,เครื่อง,500000,45000,15 Days,12\n";

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
