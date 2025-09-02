import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"
import { createKey } from "@/lib/generateKey"

// 번역 파일 업로드
export async function POST(request: NextRequest) {
  try {
    if (!prisma) {
      throw new Error("Prisma client is not available")
    }

    // FormData 파싱
    const formData = await request.formData()
    const patentId = formData.get('patentId') as string
    const section = formData.get('section') as string
    const comment = formData.get('comment') as string
    const isCompletion = formData.get('isCompletion') === 'true'
    const translatedTitleUS = formData.get('translatedTitleUS') as string
    const files = formData.getAll('files') as File[]

    if (!patentId || !section) {
      return NextResponse.json({ error: "특허 ID와 섹션이 필요합니다." }, { status: 400 })
    }

    // 특허 존재 확인
    const patent = await prisma.patent.findUnique({
      where: { id: patentId }
    })

    if (!patent) {
      return NextResponse.json({ error: "특허를 찾을 수 없습니다." }, { status: 404 })
    }

    // 실제 파일들을 S3에 업로드하고 파일 정보를 수정
    const uploadedFiles = []
    
    for (const file of files) {
      // 파일을 Buffer로 변환
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      
      // 안전한 S3 파일명 생성
      const fileExtension = file.name.split('.').pop() || ''
      const safeFileName = `${createKey(16, true)}.${fileExtension}`
      const fileKey = `patentsMng/pnu/translations/${patentId}/${section}/${safeFileName}`
      
      // S3에 파일 업로드
      await uploadToS3(fileBuffer, fileKey, 'public-read')
      
      // 업로드된 파일 정보 수정
      uploadedFiles.push({
        id: `file_${Date.now()}_${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fileKey}`,
        fileKey: fileKey,
      })
    }

    // 파일 정보를 JSON 문자열로 저장
    const filesJson = JSON.stringify(uploadedFiles)

    const translationFile = await (prisma as any).translationFile.create({
      data: {
        patentId,
        section,
        comment,
        files: filesJson,
        isCompletion,
        translatedTitleUS,
      },
    })

    // 번역 완료인 경우 번역 상태 업데이트
    if (isCompletion) {
      // 번역 레코드 확인 또는 생성
      let translation = await prisma.translation.findFirst({
        where: { patentId }
      })

      if (!translation) {
        translation = await prisma.translation.create({
          data: {
            patentId,
            originalText: patent.title,
            translatedText: translatedTitleUS || patent.title,
            status: 'COMPLETED',
          }
        })
      } else {
        // 기존 번역 레코드 업데이트
        await prisma.translation.update({
          where: { id: translation.id },
          data: {
            status: 'COMPLETED',
            translatedText: translatedTitleUS || patent.title,
          }
        })
      }

      // 특허 상태도 업데이트 (번역 완료 -> 서류 준비 단계로)
      await prisma.patent.update({
        where: { id: patentId },
        data: {
          status: 'DOCUMENT_PREP'
        }
      })
    }

    // 응답 시 파일 정보를 다시 파싱
    const responseData = {
      ...translationFile,
      files: JSON.parse(translationFile.files),
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("번역 파일 업로드 오류:", error)
    return NextResponse.json(
      { error: "번역 파일 업로드에 실패했습니다." },
      { status: 500 }
    )
  }
}

// 특허별 번역 파일 조회
export async function GET(request: NextRequest) {
  try {
    if (!prisma) {
      throw new Error("Prisma client is not available")
    }

    const { searchParams } = new URL(request.url)
    const patentId = searchParams.get("patentId")

    if (!patentId) {
      return NextResponse.json(
        { error: "특허 ID가 필요합니다." },
        { status: 400 }
      )
    }

    const translationFiles = await (prisma as any).translationFile.findMany({
      where: {
        patentId,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    })

    // 각 파일의 files 필드를 파싱
    const responseData = translationFiles.map((file: any) => ({
      ...file,
      files: JSON.parse(file.files),
    }))

    return NextResponse.json({ data: responseData })
  } catch (error) {
    console.error("번역 파일 조회 오류:", error)
    return NextResponse.json(
      { error: "번역 파일 조회에 실패했습니다." },
      { status: 500 }
    )
  }
} 