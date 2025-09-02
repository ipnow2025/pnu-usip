-- Insert sample users
INSERT INTO users (memberId, memberIdx, name, email, role, companyName, companyIdx) VALUES
('admin001', 'ADM001', '김특허', 'patent@pusan.ac.kr', 'PATENT_MANAGER', '부산대학교 산학협력단', 'PNU001'),
('prof001', 'PRF001', '박교수', 'prof.park@pusan.ac.kr', 'INVENTOR', '부산대학교', 'PNU002'),
('prof002', 'PRF002', '이연구', 'prof.lee@pusan.ac.kr', 'INVENTOR', '부산대학교', 'PNU003'),
('attorney001', 'ATT001', 'John Smith', 'john@agorallc.com', 'US_ATTORNEY', 'AGORA LLC', 'AGR001'),
('reviewer001', 'REV001', '최번역', 'translator@itl.co.kr', 'EXTERNAL_REVIEWER', '아이티엘', 'ITL001');

-- Insert sample patents
INSERT INTO patents (id, title, applicationNumber, filingDate, pctFiled, usptoEligible, dueDate, status, inventorId, managerId) VALUES
('pat001', 'AI 기반 영상 인식 시스템', 'KR10-2023-0001234', '2023-01-15', FALSE, TRUE, '2024-01-15', 'TRANSLATING', 2, 1),
('pat002', '친환경 배터리 소재 조성물', 'KR10-2023-0002345', '2023-03-20', TRUE, TRUE, '2025-09-20', 'TRANSLATION_REVIEW', 3, 1),
('pat003', '스마트 IoT 센서 네트워크', 'KR10-2023-0003456', '2023-06-10', FALSE, TRUE, '2024-06-10', 'DOCUMENT_PREP', 2, 1),
('pat004', '바이오 의료기기 제어 방법', 'KR10-2023-0004567', '2023-08-05', FALSE, FALSE, '2024-08-05', 'NO_PROGRESS', 3, 1);

-- Insert sample translations
INSERT INTO translations (id, patentId, originalText, translatedText, status, translatorId) VALUES
('trans001', 'pat001', '본 발명은 인공지능을 이용한 영상 인식 시스템에 관한 것으로...', 'The present invention relates to an image recognition system using artificial intelligence...', 'COMPLETED', 5),
('trans002', 'pat002', '본 발명은 친환경적인 배터리 소재에 관한 것으로...', 'The present invention relates to eco-friendly battery materials...', 'IN_PROGRESS', 5);

-- Insert sample documents
INSERT INTO documents (id, patentId, type, fileName, filePath, status) VALUES
('doc001', 'pat001', 'SPECIFICATION', 'specification_pat001_v1.pdf', '/documents/pat001/specification_v1.pdf', 'DRAFT'),
('doc002', 'pat001', 'CLAIMS', 'claims_pat001_v1.pdf', '/documents/pat001/claims_v1.pdf', 'DRAFT'),
('doc003', 'pat002', 'SPECIFICATION', 'specification_pat002_v1.pdf', '/documents/pat002/specification_v1.pdf', 'REVIEW');

-- Insert sample costs
INSERT INTO costs (id, patentId, type, amount, description, status) VALUES
('cost001', 'pat001', 'TRANSLATION', 1500.00, 'AI 영상인식 시스템 번역비', 'PENDING'),
('cost002', 'pat001', 'ATTORNEY_FEE', 3000.00, '변호사 검토 수수료', 'PENDING'),
('cost003', 'pat002', 'TRANSLATION', 1200.00, '배터리 소재 번역비', 'PAID');
