import { NextResponse } from "next/server"
import { documentsStore } from "@/lib/data/documents-store"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const documents = documentsStore.getAll()

    return NextResponse.json({
      success: true,
      data: documents,
      total: documents.length,
    })
  } catch (error) {
    console.error("Documents GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.patentId) {
      return NextResponse.json({ success: false, error: "Patent ID is required" }, { status: 400 })
    }

    const document = documentsStore.create({
      patentId: body.patentId,
      documents: body.documents || [],
      overallStatus: body.overallStatus || "NOT_STARTED",
      translationStatus: body.translationStatus || "NOT_STARTED",
      linkedTranslationIds: body.linkedTranslationIds || [],
      readyForFiling: body.readyForFiling || false,
      filingTriggered: body.filingTriggered || false,
      assignedAttorney: body.assignedAttorney,
    })

    return NextResponse.json(
      {
        success: true,
        data: document,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Documents POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to create document" }, { status: 500 })
  }
}
