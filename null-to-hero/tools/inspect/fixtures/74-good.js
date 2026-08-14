const baseDuration = 320;
chars.forEach((char, index) => {
  char.style.animationDelay = index * 60 + "ms";
});
