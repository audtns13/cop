-- ============================================================
-- Data On AI CoP - PostgreSQL 초기화 스크립트
-- Neon / Supabase / Railway PostgreSQL 에서 실행하세요
-- ============================================================

CREATE TABLE IF NOT EXISTS tb_user (
  user_id   VARCHAR(20)  PRIMARY KEY,
  user_nm   VARCHAR(50)  NOT NULL,
  user_pwd  VARCHAR(255) NOT NULL,
  user_role VARCHAR(10)  NOT NULL DEFAULT 'USER',
  reg_dt    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_post (
  post_id             BIGSERIAL    PRIMARY KEY,
  post_type           VARCHAR(20)  NOT NULL,
  title               VARCHAR(200) NOT NULL,
  content             TEXT,
  writer_id           VARCHAR(20),
  writer_nm           VARCHAR(50),
  meeting_dt          TIMESTAMP,
  view_cnt            INTEGER      NOT NULL DEFAULT 0,
  confirmed_lunch_nm  VARCHAR(200),
  confirmed_lunch_id  INTEGER,
  reg_dt              TIMESTAMP    NOT NULL DEFAULT NOW(),
  mod_dt              TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_comment (
  comment_id BIGSERIAL   PRIMARY KEY,
  post_id    BIGINT      NOT NULL,
  content    TEXT        NOT NULL,
  writer_id  VARCHAR(20),
  writer_nm  VARCHAR(50),
  reg_dt     TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_attendance (
  att_id   BIGSERIAL   PRIMARY KEY,
  post_id  BIGINT      NOT NULL,
  user_id  VARCHAR(20) NOT NULL,
  user_nm  VARCHAR(50),
  status   VARCHAR(10) NOT NULL,
  reg_dt   TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS tb_lunch_menu (
  menu_id   SERIAL       PRIMARY KEY,
  menu_nm   VARCHAR(100) NOT NULL,
  menu_addr VARCHAR(200),
  reg_dt    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_lunch_menu_item (
  item_id BIGSERIAL    PRIMARY KEY,
  menu_id INTEGER      NOT NULL,
  item_nm VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS tb_lunch_vote (
  vote_id         BIGSERIAL   PRIMARY KEY,
  meeting_post_id BIGINT,
  menu_id         INTEGER,
  menu_nm         VARCHAR(100),
  user_id         VARCHAR(20) NOT NULL,
  user_nm         VARCHAR(50),
  not_eating_yn   VARCHAR(1)  NOT NULL DEFAULT 'N',
  custom_yn       VARCHAR(1)  NOT NULL DEFAULT 'N',
  vote_dt         TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, meeting_post_id)
);

CREATE TABLE IF NOT EXISTS tb_file_info (
  file_id   BIGSERIAL    PRIMARY KEY,
  post_id   BIGINT,
  orig_nm   VARCHAR(255),
  file_size BIGINT,
  reg_dt    TIMESTAMP    NOT NULL DEFAULT NOW()
);
