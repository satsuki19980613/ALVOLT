export class HudManager {
  constructor(mobileControlManager) {
    this.mobileControlManager = mobileControlManager;

    this.els = {
      hpBarInner: document.getElementById("hp-bar-inner"),
      hpValue: document.getElementById("hp-value"),
      epValue: document.getElementById("ep-value"),
      sizeValue: document.getElementById("size-value"),
      powerLabel: document.getElementById("power-label"),
      powerValue: document.getElementById("power-value"),
      leaderboardList: document.getElementById("leaderboard-list"),
    };
  }

  update(playerState, tradeState) {
    if (!playerState || !this.els.hpBarInner) return;

    const hpPercent =
      playerState.hp !== undefined ? (playerState.hp / 100) * 100 : 0;
    this.els.hpBarInner.style.width = `${hpPercent}%`;
    if (this.els.hpValue)
      this.els.hpValue.textContent = Math.ceil(playerState.hp || 0);

    if (this.els.epValue) {
      this.els.epValue.textContent =
        playerState.ep !== undefined ? Math.ceil(playerState.ep) : 0;
    }

    if (this.els.sizeValue) {
      const chargeBetAmount = playerState.chargeBetAmount || 10;
      this.els.sizeValue.textContent = Math.ceil(chargeBetAmount);

      const isShortEp =
        !playerState.chargePosition && playerState.ep < chargeBetAmount;
      this.els.sizeValue.style.color = isShortEp ? "#f44336" : "white";
    }

    if (this.els.powerValue && this.els.powerLabel) {
      this.updatePowerValue(playerState, tradeState);
    }

    if (this.mobileControlManager) {
      this.mobileControlManager.updateDisplay(playerState);
    }
  }

  updatePowerValue(playerState, tradeState) {
    const currentPrice = tradeState ? tradeState.currentPrice : 1000;
    const chargePosition = playerState.chargePosition;
    let level = 0;

    if (chargePosition) {
      const priceDiff =
        chargePosition.type === "short"
          ? chargePosition.entryPrice - currentPrice
          : currentPrice - chargePosition.entryPrice;
      level = priceDiff * chargePosition.amount;
    }

    const intLevel = level > 0 ? Math.ceil(level) : Math.floor(level);
    const levelText =
      intLevel === 0 ? "0" : (intLevel > 0 ? "+" : "") + intLevel;
    const levelColor =
      intLevel > 0 ? "#00ff00" : intLevel < 0 ? "#ff0055" : "white";

    this.els.powerLabel.textContent = "Power";
    this.els.powerValue.textContent = levelText;
    this.els.powerValue.style.color = levelColor;
  }

  updateLeaderboard(leaderboardData, myUserId) {
    if (!this.els.leaderboardList) return;
    this.els.leaderboardList.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const player = leaderboardData ? leaderboardData[i] : null;
      const li = document.createElement("li");
      li.className = "leaderboard-row";

      if (player) {
        li.innerHTML = `
          <span class="lb-name">${player.name}</span>
          <span class="lb-score">${Math.floor(
            player.score
          ).toLocaleString()}</span>
        `;
        if (player.id === myUserId) li.classList.add("you");
      } else {
        li.classList.add("empty");
        li.innerHTML =
          '<span class="lb-name">...</span><span class="lb-score">-</span>';
      }
      this.els.leaderboardList.appendChild(li);
    }
  }

  setMobileControlManager(manager) {
    this.mobileControlManager = manager;
  }
}
