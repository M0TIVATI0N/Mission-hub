(() => {
  "use strict";
  const layer = document.querySelector(".meteor-layer");
  if (!layer || layer.dataset.meteorsReady === "true") {
    return;
  }
  layer.dataset.meteorsReady = "true";
  layer.setAttribute("aria-hidden", "true");

  let seed = 0x51a7c0de;
  function randomBetween(min, max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return min + (seed / 4294967296) * (max - min);
  }

  const fragment = document.createDocumentFragment();
  const arrivals = [0.5, 2.7, 5, 6.8, 9.4, 11.7, 14.1, 16.5];
  for (let index = 0; index < arrivals.length; index += 1) {
    const star = document.createElement("span");
    star.className = "shooting-star";
    const travelX = randomBetween(24, 47);
    const travelY = randomBetween(11, 27);
    const duration =
      index === 0 ? 16 : Math.max(randomBetween(12, 24), arrivals[index] + 2.3);

    const angle = (Math.atan2(travelY, travelX) * 180) / Math.PI;
    const delay = index === 0 ? 0.02 : -duration + arrivals[index] - duration * 0.03;
    const properties = {
      "--start-x": `${randomBetween(1, 71).toFixed(2)}%`,
      "--start-y": `${randomBetween(2, 35).toFixed(2)}%`,
      "--travel-x": `${travelX.toFixed(2)}vw`,
      "--travel-y": `${travelY.toFixed(2)}vw`,
      "--trail-length": `${randomBetween(105, 195).toFixed(0)}px`,
      "--flight-angle": `${angle.toFixed(2)}deg`,
      "--flight-duration": `${duration.toFixed(2)}s`,
      "--flight-delay": `${delay.toFixed(2)}s`,
    };
    for (const [property, value] of Object.entries(properties)) {
      star.style.setProperty(property, value);
    }
    fragment.append(star);
  }
  layer.replaceChildren(fragment);

  const scene = layer.closest(".space-menu");
  if (scene) {
    const updateVisibility = () =>
      scene.classList.toggle("scene-inactive", document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
  }
})();
