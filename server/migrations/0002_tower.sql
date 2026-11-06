-- v1.71：無盡試煉塔每週排行（本週的週一日期、本週最高層、歷史最高層）
ALTER TABLE scores ADD COLUMN tower_week TEXT NOT NULL DEFAULT '';
ALTER TABLE scores ADD COLUMN tower_floor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scores ADD COLUMN tower_best INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_scores_tower ON scores (tower_week, tower_floor DESC);
