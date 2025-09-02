import { NextRequest, NextResponse } from "next/server"
import { downloadBufferFromS3 } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")
    const fileKey = searchParams.get("fileKey")

    let key: string

    if (fileKey) {
      // fileKey가 직접 제공된 경우
      key = fileKey
    } else if (url) {
      // URL이 제공된 경우 (기존 방식)
      const urlObj = new URL(url)
      key = urlObj.pathname.substring(1) // 앞의 '/' 제거
      key = decodeURIComponent(key)
    } else {
      return NextResponse.json(
        { error: "URL 또는 fileKey가 필요합니다." },
        { status: 400 }
      )
    }

    // 기존 s3.ts의 함수 사용
    const fileBuffer = await downloadBufferFromS3(key)
    
    // 브라우저에서 Blob 데이터를 만들기 위한 정보 응답
    return NextResponse.json({
      type: 'application/octet-stream', // 기본 타입
      arrayBuffer: Array.from(new Uint8Array(fileBuffer)),
    })
  } catch (error) {
    console.error("파일 가져오기 오류:", error)
    return NextResponse.json(
      { error: "파일을 가져오는데 실패했습니다." },
      { status: 500 }
    )
  }
} 