let animationOffset = 0;
words.forEach((word) => {
  const finalAnimationDelay = animationOffset + unitDelay;
  span.style.animationDelay = finalAnimationDelay + "ms";
  animationOffset = finalAnimationDelay + baseDuration;
});
