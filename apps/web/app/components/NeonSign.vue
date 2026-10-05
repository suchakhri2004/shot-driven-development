<template>
  <!-- The bar's neon sign, hung on two chains. Pure CSS: glass tubes are text-shadow, the board is a dark plank. -->
  <div class="sign" role="img" aria-label="Shot-Driven Development">
    <div class="chains" aria-hidden="true"><i /><i /></div>
    <div class="board">
      <div class="tube pink">SH<span class="flicker">O</span>T</div>
      <div class="tube amber">DRIVEN DEV</div>
      <div class="tube teal small">ซดก่อน ค่อย debug</div>
      <i class="screw tl" /><i class="screw tr" /><i class="screw bl" /><i class="screw br" />
    </div>
  </div>
</template>

<style scoped>
.sign {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.chains {
  display: flex;
  justify-content: space-between;
  width: 62%;
  height: 26px;
}
.chains i {
  width: 4px;
  background: repeating-linear-gradient(180deg, #8a7d7a 0 5px, #2c2022 5px 8px);
  border-radius: 2px;
}
.board {
  position: relative;
  padding: 0.9rem 1.6rem 0.8rem;
  text-align: center;
  background: #0b0809;
  border: 3px solid #050304;
  border-radius: 14px;
  box-shadow: inset 0 0 0 2px #1d1517, 0 8px 0 #000, 0 0 60px rgba(227, 36, 43, 0.18);
  transform: rotate(-1.5deg);
}
.tube {
  font: italic 800 3.1rem/0.95 'Kanit', sans-serif;
  letter-spacing: 0.02em;
}
.tube.pink {
  color: #ffe3e3;
  text-shadow: 0 0 2px #fff, 0 0 7px #ff2b33, 0 0 16px #ff2b33, 0 0 34px #e3242b;
}
.tube.amber {
  margin-top: 0.15rem;
  font-size: 1.55rem;
  color: #ffffff;
  text-shadow: 0 0 2px #fff, 0 0 6px #fff, 0 0 14px rgba(255, 255, 255, 0.55), 0 0 26px rgba(255, 60, 60, 0.45);
}
.tube.small {
  margin-top: 0.45rem;
  font: 600 0.95rem 'Kanit', 'IBM Plex Sans Thai', sans-serif;
  color: #ffe3e3;
  text-shadow: 0 0 2px #fff, 0 0 7px #ff2b33, 0 0 16px #ff2b33;
}
/* one tired tube that flickers now and then */
.flicker {
  animation: flicker 6s infinite;
}
@keyframes flicker {
  0%,
  89%,
  93%,
  100% {
    opacity: 1;
  }
  90%,
  92% {
    opacity: 0.25;
  }
  91% {
    opacity: 0.8;
  }
}
.screw {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8a7d7a;
  box-shadow: inset -1px -1px 0 #2c2022;
}
.tl {
  left: 8px;
  top: 8px;
}
.tr {
  right: 8px;
  top: 8px;
}
.bl {
  left: 8px;
  bottom: 8px;
}
.br {
  right: 8px;
  bottom: 8px;
}
</style>
