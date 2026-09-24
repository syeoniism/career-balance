-- 유저 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,     -- bcrypt 해시 저장
    nickname VARCHAR(30) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


--- resume 테이블
CREATE TABLE resumes (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     title VARCHAR(255),
     intro TEXT,
     education TEXT,
     experience TEXT,
     skills TEXT,
     awards TEXT,
     certificates TEXT,
     projects TEXT,
     languages TEXT,
     links TEXT,
     template INT DEFAULT 1,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     resume_title VARCHAR(255),
     name VARCHAR(255),
     email VARCHAR(255),
     telephone VARCHAR(255),
     github_id VARCHAR(255),
     profile_image_url VARCHAR(255),
     is_public TINYINT(1) DEFAULT 0,
     shared_token VARCHAR(255),
     internships TEXT,
     activities TEXT,
     others TEXT,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- resume_sections
CREATE TABLE IF NOT EXISTS resume_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    content LONGTEXT,
    sort_order INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cover_letters
CREATE TABLE IF NOT EXISTS cover_letters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_public TINYINT(1) DEFAULT 0,
    shared_token VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- cover_letter_sections(자기소개서 섹션)
CREATE TABLE IF NOT EXISTS cover_letter_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cover_letter_id INT NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL,
    sort_order INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cover_letter_id) REFERENCES cover_letters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 게시글 테이블 (일반글 + 밸런스게임글 공통)
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,               -- 글 작성자
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('normal', 'balance') NOT NULL DEFAULT 'normal',  -- 일반/밸런스 구분
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 밸런스 게임 옵션 (A vs B vs C ...)
CREATE TABLE IF NOT EXISTS balance_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    option_index INT NOT NULL,          -- 1,2,3,... 몇 번째 항목인지
    label VARCHAR(100) NOT NULL,        -- 옵션 내용 (예: "대기업", "공기업")
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_option (post_id, option_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 투표 테이블
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    option_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_vote (post_id, user_id),  -- 한 글당 한 번만 투표 가능
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES balance_options(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 댓글 / 대댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT NULL,                 -- NULL이면 일반 댓글, 값 있으면 대댓글
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
