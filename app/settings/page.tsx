"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Download,
  Upload,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { goToInternalUrl, getUserId, isLoggedIn } from "@/lib/func"

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    // 시스템 설정
    systemName: "부산대학교 특허관리시스템",
    universityName: "부산대학교",
    cooperationName: "부산대학교 산학협력단",
    timezone: "Asia/Seoul",
    language: "ko",

    // 알림 설정
    emailNotifications: true,
    smsNotifications: false,
    deadlineAlerts: true,
    statusChangeAlerts: true,
    weeklyReports: true,

    // 보안 설정
    sessionTimeout: 30,
    passwordExpiry: 90,
    twoFactorAuth: false,
    ipRestriction: false,

    // 백업 설정
    autoBackup: true,
    backupFrequency: "daily",
    retentionPeriod: 30,

    // API 설정
    aiTranslationApi: "",
    usptoApiKey: "",
    emailSmtpServer: "",
    emailSmtpPort: 587,
  })

  useEffect(() => {
    const uid = getUserId()
    setUserId(uid)
    if (!isLoggedIn()) {
      goToInternalUrl("/login")
    }
  }, [])

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    console.log("Settings saved:", settings)
    // 설정 저장 로직
  }

  const handleBackup = () => {
    console.log("Manual backup initiated")
  }

  const handleRestore = () => {
    console.log("System restore initiated")
  }

  if (!userId) {
    return <div className="min-h-screen flex items-center justify-center">로딩중...</div>
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">시스템 설정</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">시스템 환경 설정 및 관리</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleBackup}>
                  <Download className="h-4 w-4 mr-2" />
                  백업
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general">일반</TabsTrigger>
                <TabsTrigger value="notifications">알림</TabsTrigger>
                <TabsTrigger value="security">보안</TabsTrigger>
                <TabsTrigger value="backup">백업</TabsTrigger>
                <TabsTrigger value="integrations">연동</TabsTrigger>
                <TabsTrigger value="system">시스템</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>기본 설정</span>
                      </CardTitle>
                      <CardDescription>시스템 기본 정보 및 환경 설정</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="systemName">시스템명</Label>
                        <Input
                          id="systemName"
                          value={settings.systemName}
                          onChange={(e) => handleSettingChange("systemName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="universityName">대학명</Label>
                        <Input
                          id="universityName"
                          value={settings.universityName}
                          onChange={(e) => handleSettingChange("universityName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cooperationName">산학협력단명</Label>
                        <Input
                          id="cooperationName"
                          value={settings.cooperationName}
                          onChange={(e) => handleSettingChange("cooperationName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">시간대</Label>
                        <Select
                          value={settings.timezone}
                          onValueChange={(value) => handleSettingChange("timezone", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">언어</Label>
                        <Select
                          value={settings.language}
                          onValueChange={(value) => handleSettingChange("language", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ko">한국어</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Globe className="h-5 w-5" />
                        <span>지역화 설정</span>
                      </CardTitle>
                      <CardDescription>날짜, 시간, 통화 형식 설정</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">날짜 형식</span>
                          <Badge variant="outline">YYYY-MM-DD</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">시간 형식</span>
                          <Badge variant="outline">24시간</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">기본 통화</span>
                          <Badge variant="outline">USD</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">숫자 형식</span>
                          <Badge variant="outline">1,234.56</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>알림 설정</span>
                    </CardTitle>
                    <CardDescription>이메일, SMS 및 시스템 알림 설정</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">이메일 알림</div>
                          <div className="text-sm text-gray-500">중요한 업데이트를 이메일로 받기</div>
                        </div>
                        <Switch
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">SMS 알림</div>
                          <div className="text-sm text-gray-500">긴급 알림을 SMS로 받기</div>
                        </div>
                        <Switch
                          checked={settings.smsNotifications}
                          onCheckedChange={(checked) => handleSettingChange("smsNotifications", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">마감일 알림</div>
                          <div className="text-sm text-gray-500">특허 마감일 임박 시 알림</div>
                        </div>
                        <Switch
                          checked={settings.deadlineAlerts}
                          onCheckedChange={(checked) => handleSettingChange("deadlineAlerts", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">상태 변경 알림</div>
                          <div className="text-sm text-gray-500">특허 상태 변경 시 알림</div>
                        </div>
                        <Switch
                          checked={settings.statusChangeAlerts}
                          onCheckedChange={(checked) => handleSettingChange("statusChangeAlerts", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">주간 보고서</div>
                          <div className="text-sm text-gray-500">매주 진행 상황 요약 보고서</div>
                        </div>
                        <Switch
                          checked={settings.weeklyReports}
                          onCheckedChange={(checked) => handleSettingChange("weeklyReports", checked)}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">이메일 설정</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emailSmtpServer">SMTP 서버</Label>
                          <Input
                            id="emailSmtpServer"
                            value={settings.emailSmtpServer}
                            onChange={(e) => handleSettingChange("emailSmtpServer", e.target.value)}
                            placeholder="smtp.gmail.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emailSmtpPort">SMTP 포트</Label>
                          <Input
                            id="emailSmtpPort"
                            type="number"
                            value={settings.emailSmtpPort}
                            onChange={(e) => handleSettingChange("emailSmtpPort", Number.parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>보안 설정</span>
                    </CardTitle>
                    <CardDescription>시스템 보안 및 접근 제어 설정</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sessionTimeout">세션 타임아웃 (분)</Label>
                          <Input
                            id="sessionTimeout"
                            type="number"
                            value={settings.sessionTimeout}
                            onChange={(e) => handleSettingChange("sessionTimeout", Number.parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="passwordExpiry">비밀번호 만료 (일)</Label>
                          <Input
                            id="passwordExpiry"
                            type="number"
                            value={settings.passwordExpiry}
                            onChange={(e) => handleSettingChange("passwordExpiry", Number.parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">2단계 인증</div>
                            <div className="text-sm text-gray-500">추가 보안 계층</div>
                          </div>
                          <Switch
                            checked={settings.twoFactorAuth}
                            onCheckedChange={(checked) => handleSettingChange("twoFactorAuth", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">IP 제한</div>
                            <div className="text-sm text-gray-500">특정 IP에서만 접근 허용</div>
                          </div>
                          <Switch
                            checked={settings.ipRestriction}
                            onCheckedChange={(checked) => handleSettingChange("ipRestriction", checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">비밀번호 정책</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>최소 8자 이상</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>대소문자, 숫자, 특수문자 포함</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>이전 5개 비밀번호와 다름</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="backup">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>백업 및 복원</span>
                    </CardTitle>
                    <CardDescription>데이터 백업 및 시스템 복원 설정</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">자동 백업</div>
                            <div className="text-sm text-gray-500">정기적으로 자동 백업 수행</div>
                          </div>
                          <Switch
                            checked={settings.autoBackup}
                            onCheckedChange={(checked) => handleSettingChange("autoBackup", checked)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="backupFrequency">백업 주기</Label>
                          <Select
                            value={settings.backupFrequency}
                            onValueChange={(value) => handleSettingChange("backupFrequency", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">매시간</SelectItem>
                              <SelectItem value="daily">매일</SelectItem>
                              <SelectItem value="weekly">매주</SelectItem>
                              <SelectItem value="monthly">매월</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="retentionPeriod">보관 기간 (일)</Label>
                          <Input
                            id="retentionPeriod"
                            type="number"
                            value={settings.retentionPeriod}
                            onChange={(e) => handleSettingChange("retentionPeriod", Number.parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">수동 백업</h4>
                          <p className="text-sm text-gray-500 mb-3">현재 시스템 상태를 즉시 백업합니다.</p>
                          <Button onClick={handleBackup} className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            지금 백업
                          </Button>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">시스템 복원</h4>
                          <p className="text-sm text-gray-500 mb-3">백업 파일에서 시스템을 복원합니다.</p>
                          <Button variant="outline" onClick={handleRestore} className="w-full">
                            <Upload className="h-4 w-4 mr-2" />
                            복원하기
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">최근 백업 이력</h4>
                      <div className="space-y-2">
                        {[
                          { date: "2024-01-20 02:00", type: "자동", size: "245 MB", status: "성공" },
                          { date: "2024-01-19 02:00", type: "자동", size: "243 MB", status: "성공" },
                          { date: "2024-01-18 15:30", type: "수동", size: "241 MB", status: "성공" },
                        ].map((backup, index) => (
                          <div key={index} className="flex justify-between items-center p-3 border rounded">
                            <div className="flex items-center space-x-4">
                              <div>
                                <div className="font-medium">{backup.date}</div>
                                <div className="text-sm text-gray-500">
                                  {backup.type} 백업 • {backup.size}
                                </div>
                              </div>
                            </div>
                            <Badge variant={backup.status === "성공" ? "default" : "destructive"}>
                              {backup.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations">
                <Card>
                  <CardHeader>
                    <CardTitle>외부 서비스 연동</CardTitle>
                    <CardDescription>AI 번역, USPTO API 등 외부 서비스 설정</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="aiTranslationApi">AI 번역 API 키</Label>
                        <Input
                          id="aiTranslationApi"
                          type="password"
                          value={settings.aiTranslationApi}
                          onChange={(e) => handleSettingChange("aiTranslationApi", e.target.value)}
                          placeholder="AI 번역 서비스 API 키를 입력하세요"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="usptoApiKey">USPTO API 키</Label>
                        <Input
                          id="usptoApiKey"
                          type="password"
                          value={settings.usptoApiKey}
                          onChange={(e) => handleSettingChange("usptoApiKey", e.target.value)}
                          placeholder="USPTO API 키를 입력하세요"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">연동 상태</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>AI 번역 서비스</span>
                          <Badge variant="default">연결됨</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>USPTO API</span>
                          <Badge variant="outline">미연결</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>이메일 서비스</span>
                          <Badge variant="default">연결됨</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>시스템 정보</CardTitle>
                      <CardDescription>현재 시스템 상태 및 정보</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">버전</span>
                        <span className="text-sm">v2.1.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">데이터베이스</span>
                        <span className="text-sm">MySQL 8.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">서버 시간</span>
                        <span className="text-sm">2024-01-20 15:30:45 KST</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">업타임</span>
                        <span className="text-sm">15일 3시간 22분</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">디스크 사용량</span>
                        <span className="text-sm">2.4GB / 100GB</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>시스템 관리</CardTitle>
                      <CardDescription>시스템 유지보수 및 관리 도구</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        캐시 초기화
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Database className="h-4 w-4 mr-2" />
                        데이터베이스 최적화
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        로그 다운로드
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        시스템 재시작
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
