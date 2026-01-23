const buttons = document.querySelectorAll("button");

const handleClick = (event) => {
  const label = event.target.textContent.trim();
  alert(`Thanks for your interest! We'll help you "${label.toLowerCase()}".`);
};

buttons.forEach((button) => {
  button.addEventListener("click", handleClick);
});
