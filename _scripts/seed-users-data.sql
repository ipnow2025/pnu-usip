-- 사용자 초기 데이터 삽입
INSERT INTO users (memberId, memberIdx, name, nameEn, email, role, organization, department, phone, mobile, status, addressKr, addressEn) VALUES
('inv001', 'INV001', '홍길동', 'Hong Gil-dong', 'hong@pnu.ac.kr', 'INVENTOR', '부산대학교', '컴퓨터공학과', '051-510-1234', '010-1234-5678', 'ACTIVE', '부산광역시 금정구 부산대학로 63번길 2', '2, Busandaehak-ro 63beon-gil, Geumjeong-gu, Busan, Republic of Korea'),
('inv002', 'INV002', '김철수', 'Kim Chul-su', 'kim@pnu.ac.kr', 'INVENTOR', '부산대학교', '전자공학과', '051-510-2345', '010-2345-6789', 'ACTIVE', '부산광역시 금정구 부산대학로 63번길 2', '2, Busandaehak-ro 63beon-gil, Geumjeong-gu, Busan, Republic of Korea'),
('att001', 'ATT001', '홍길동', 'Hong Gil-dong', 'hong2@agora.com', 'US_ATTORNEY', 'AGORA LLC', '법무팀', '+1-555-0123', '+1-555-0124', 'ACTIVE', NULL, NULL),
('inv003', 'INV003', '이영희', 'Lee Young-hee', 'lee@pnu.ac.kr', 'INVENTOR', '부산대학교', '기계공학과', '051-510-3456', '010-3456-7890', 'ACTIVE', '부산광역시 금정구 부산대학로 63번길 2', '2, Busandaehak-ro 63beon-gil, Geumjeong-gu, Busan, Republic of Korea'),
('inv004', 'INV004', '박민수', 'Park Min-su', 'park@pnu.ac.kr', 'INVENTOR', '부산대학교', '화학공학과', '051-510-4567', '010-4567-8901', 'ACTIVE', '부산광역시 금정구 부산대학로 63번길 2', '2, Busandaehak-ro 63beon-gil, Geumjeong-gu, Busan, Republic of Korea'),
('mgr001', 'MGR001', '김특허', 'Kim Patent', 'kim.patent@pnu.ac.kr', 'PATENT_MANAGER', '부산대학교 산학협력단', '특허관리팀', '051-510-5678', '010-5678-9012', 'ACTIVE', NULL, NULL);
