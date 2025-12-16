// src_v2/domain/auth/UserEntity.js

export class UserEntity {
  constructor(uid = null, name = "Guest", isGuest = true) {
    this.uid = uid;
    this.name = name;
    this.isGuest = isGuest;
    this.highScore = 0;
  }

  static createGuest() {
    return new UserEntity(null, "Guest", true);
  }

  static createMember(uid, name) {
    return new UserEntity(uid, name, false);
  }
}