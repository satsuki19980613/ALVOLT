/**
 * 通信プロトコルに関連する定数定義
 */
export const Protocol = {
  MSG_TYPE_DELTA: 1,
  MSG_TYPE_INPUT: 2,
  INPUT_BIT_MAP: {
    move_up: 1 << 0,
    move_down: 1 << 1,
    move_left: 1 << 2,
    move_right: 1 << 3,
    shoot: 1 << 4,
    trade_long: 1 << 5,
    bet_up: 1 << 6,
    bet_down: 1 << 7,
    bet_all: 1 << 8,
    bet_min: 1 << 9,
    trade_short: 1 << 10,
    trade_settle: 1 << 11,
  },
};
export const BulletType = {
  DEFAULT: 0,
  ENEMY: 1,
  ORB: 2,       // Power 0-50
  SLASH: 3,     // Power 50-100
  FIREBALL: 4,
  ITEM_EP: 5  // Power 100+
};