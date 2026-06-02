import { NextResponse } from "next/server";
import { utils, write } from "xlsx";


export async function GET() {
  // Define columns matching the inventory upload logic
  const data = [
    {
      LocationCode: "WH-CENTER",
      ItemMetaCode: "TC-001",
      QTYLine: 5,
      Description: "Example: Warehouse Center"
    },
    {
      LocationCode: "P2024-001",
      ItemMetaCode: "HM-022",
      QTYLine: 2,
      Description: "Example: Site Project"
    }
  ];

  // Create a worksheet
  const worksheet = utils.json_to_sheet(data);
  
  // Create a workbook
  const workbook = utils.book_new();
  // Name must match ST_StockRemainingReport_0 as expected by the upload API
  utils.book_append_sheet(workbook, worksheet, "ST_StockRemainingReport_0");

  // Write to a buffer (Excel format)
  const excelBuffer = write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="inventory_remaining_template.xlsx"',
    },
  });
}
