// 사용자 검색 API 테스트
async function testUserSearch() {
  console.log("=== 사용자 검색 API 테스트 시작 ===")

  try {
    // 1. 빈 검색어 테스트
    console.log("\n1. 빈 검색어 테스트:")
    const emptyResponse = await fetch("/api/users/search?name=")
    const emptyResult = await emptyResponse.json()
    console.log("빈 검색어 결과:", emptyResult)

    // 2. 기존 사용자 검색 테스트
    console.log("\n2. 기존 사용자 '박민수' 검색:")
    const existingResponse = await fetch("/api/users/search?name=박민수")
    const existingResult = await existingResponse.json()
    console.log("박민수 검색 결과:", existingResult)

    // 3. 존재하지 않는 사용자 검색
    console.log("\n3. 존재하지 않는 사용자 '김희수' 검색:")
    const nonExistentResponse = await fetch("/api/users/search?name=김희수")
    const nonExistentResult = await nonExistentResponse.json()
    console.log("김희수 검색 결과:", nonExistentResult)

    // 4. 전체 사용자 목록 조회
    console.log("\n4. 전체 사용자 목록 조회:")
    const allUsersResponse = await fetch("/api/users")
    const allUsers = await allUsersResponse.json()
    console.log("전체 사용자:", allUsers)

    // 5. 새 사용자 생성 테스트
    console.log("\n5. 새 사용자 '김희수' 생성:")
    const createResponse = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "김희수",
        role: "발명자",
        email: "kim.heesu@test.com",
        organization: "테스트대학교",
        department: "컴퓨터공학과",
      }),
    })
    const newUser = await createResponse.json()
    console.log("새 사용자 생성 결과:", newUser)

    // 6. 생성 후 다시 검색
    console.log("\n6. 생성 후 '김희수' 다시 검색:")
    const afterCreateResponse = await fetch("/api/users/search?name=김희수")
    const afterCreateResult = await afterCreateResponse.json()
    console.log("생성 후 김희수 검색 결과:", afterCreateResult)
  } catch (error) {
    console.error("테스트 중 오류 발생:", error)
  }

  console.log("\n=== 테스트 완료 ===")
}

// 테스트 실행
testUserSearch()
