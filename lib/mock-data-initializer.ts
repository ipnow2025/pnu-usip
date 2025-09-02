// 데이터베이스 초기 데이터 설정
export async function initializeMockData() {
  if (typeof window === "undefined") return

  try {
    // API를 통해 데이터 확인
    const usersResponse = await fetch('/api/users')
    const patentsResponse = await fetch('/api/patents')
    
    const users = await usersResponse.json()
    const patents = await patentsResponse.json()
    
    // 데이터가 없으면 마이그레이션 실행
    if (!users || users.length === 0) {
      console.log('데이터베이스에 초기 데이터가 없습니다. 마이그레이션을 실행합니다...')
      
      // 마이그레이션 API 호출 (실제로는 서버에서 실행되어야 함)
      const migrationResponse = await fetch('/api/migrate', {
        method: 'POST'
      })
      
      if (migrationResponse.ok) {
        console.log('초기 데이터 마이그레이션이 완료되었습니다.')
      } else {
        console.error('마이그레이션 실패:', await migrationResponse.text())
      }
    } else {
      console.log('데이터베이스에 이미 데이터가 존재합니다.')
    }
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error)
  }
}
