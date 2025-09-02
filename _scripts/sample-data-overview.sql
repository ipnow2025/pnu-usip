-- =====================================================
-- 현재 목업 데이터 현황 (메모리 저장소 기준)
-- =====================================================

-- 1. 사용자 데이터 (users-store.ts)
-- 기본 사용자: 박민수 (발명자)
-- 추가 생성된 사용자들:
INSERT INTO users VALUES 
('user_001', '김철수', 'Kim Chul-Su', 'kim@pnu.ac.kr', 'INVENTOR', '부산대학교', '컴퓨터공학과', '051-510-1234', '010-1234-5678', '부산시 금정구', 'Busan, Korea', '활성', NOW(), NOW()),
('user_002', '이영희', 'Lee Young-Hee', 'lee@pnu.ac.kr', 'INVENTOR', '부산대학교', '전자공학과', '051-510-2345', '010-2345-6789', '부산시 금정구', 'Busan, Korea', '활성', NOW(), NOW()),
('user_003', '박민수', 'Park Min-Su', 'park@pnu.ac.kr', 'INVENTOR', '부산대학교', '기계공학과', '051-510-3456', '010-3456-7890', '부산시 금정구', 'Busan, Korea', '활성', NOW(), NOW());

-- 2. 특허 데이터 (patents-store.ts)
INSERT INTO patents VALUES 
('patent_001', 'PNU-2024-001', '인공지능 기반 특허 분석 시스템', 'AI-based Patent Analysis System', '10-2024-0001234', NULL, NULL, NULL, '2024-01-15', 'TRANSLATING', TRUE, TRUE, 'HIGH', '우선 처리 필요', NOW(), NOW(), 'user_001', NULL),
('patent_002', 'PNU-2024-002', '블록체인 기반 데이터 보안 시스템', 'Blockchain-based Data Security System', '10-2024-0002345', NULL, NULL, NULL, '2024-02-20', 'DOCUMENT_PREP', FALSE, TRUE, 'MEDIUM', NULL, NOW(), NOW(), 'user_002', NULL),
('patent_003', 'PNU-2024-003', 'IoT 센서 네트워크 최적화 방법', 'IoT Sensor Network Optimization Method', '10-2024-0003456', NULL, NULL, NULL, '2024-03-10', 'USPTO_FILING', TRUE, TRUE, 'HIGH', NULL, NOW(), NOW(), 'user_003', NULL);

-- 3. 특허-발명자 관계 데이터
INSERT INTO patent_inventors VALUES 
('pi_001', 'patent_001', 'user_001', 1, NOW()),
('pi_002', 'patent_001', 'user_002', 2, NOW()),
('pi_003', 'patent_002', 'user_002', 1, NOW()),
('pi_004', 'patent_002', 'user_003', 2, NOW()),
('pi_005', 'patent_002', 'user_001', 3, NOW()),
('pi_006', 'patent_003', 'user_003', 1, NOW()),
('pi_007', 'patent_003', 'user_001', 2, NOW()),
('pi_008', 'patent_003', 'user_002', 3, NOW());

-- 4. 우선권 특허 데이터
INSERT INTO priority_patents VALUES 
('pp_001', 'patent_001', '특허 분석 기초 시스템', '2023-01-15', '10-2023-0001234', 1, NOW());

-- 5. 번역 데이터 (translations-store.ts)
INSERT INTO translations VALUES 
('trans_001', 'patent_001', 'IN_PROGRESS', 'user_001', NULL, NOW(), NULL, NULL, NULL, '번역 진행 중', NOW(), NOW(), 'user_001'),
('trans_002', 'patent_002', 'COMPLETED', 'user_002', 'user_003', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL, '번역 완료', NOW(), NOW(), 'user_002');

-- 6. 번역 파일 데이터
INSERT INTO translation_files VALUES 
('tf_001', 'trans_001', 'PNU-2024-001_original.pdf', '/files/translations/trans_001/original.pdf', 'ORIGINAL', 1048576, 'user_001', NOW()),
('tf_002', 'trans_001', 'PNU-2024-001_translated.pdf', '/files/translations/trans_001/translated.pdf', 'TRANSLATED', 1258291, 'user_001', NOW()),
('tf_003', 'trans_002', 'PNU-2024-002_original.pdf', '/files/translations/trans_002/original.pdf', 'ORIGINAL', 1048576, 'user_002', NOW()),
('tf_004', 'trans_002', 'PNU-2024-002_translated.pdf', '/files/translations/trans_002/translated.pdf', 'TRANSLATED', 1258291, 'user_002', NOW());

-- 7. 서류 준비 데이터 (documents-store.ts)
INSERT INTO document_preparations VALUES 
('dp_001', 'patent_002', 'UNDER_REVIEW', 'COMPLETED', FALSE, FALSE, 'user_001', NOW(), NOW()),
('dp_002', 'patent_003', 'SIGNATURE_PENDING', 'COMPLETED', TRUE, FALSE, 'user_001', NOW(), NOW());

-- 8. 서류 항목 데이터
INSERT INTO document_items VALUES 
('di_001', 'dp_001', 'DECLARATION', 'UNDER_REVIEW', NULL, 'user_001', NOW(), NOW()),
('di_002', 'dp_001', 'ADS', 'COMPLETED', NULL, 'user_001', NOW(), NOW()),
('di_003', 'dp_001', 'SPECIFICATION', 'TRANSLATION_LINKED', 'trans_002', 'user_001', NOW(), NOW()),
('di_004', 'dp_002', 'DECLARATION', 'SIGNATURE_PENDING', NULL, 'user_001', NOW(), NOW()),
('di_005', 'dp_002', 'ADS', 'SIGNATURE_PENDING', NULL, 'user_001', NOW(), NOW());

-- 9. 출원 데이터 (filings-store.ts)
INSERT INTO filings VALUES 
('filing_001', 'patent_003', 'USPTO_FILING', 'FILED', 'dp_002', TRUE, NOW(), 'US17/123456', '2024-03-15', NULL, NULL, NOW(), NOW());

-- 10. OA 히스토리 데이터
INSERT INTO oa_histories VALUES 
('oa_001', 'patent_003', 1, 'OA-2024-001', '2024-04-01', '2024-07-01', 'Non-Final Office Action', 'IN_PROGRESS', NULL, NOW(), NOW());

-- 현재 데이터 통계:
-- - 사용자: 3명 (발명자)
-- - 특허: 3건 (각기 다른 상태)
-- - 번역: 2건 (진행중 1, 완료 1)
-- - 서류준비: 2건 (검토중 1, 서명대기 1)
-- - 출원: 1건 (출원완료)
-- - OA: 1건 (대응중)
