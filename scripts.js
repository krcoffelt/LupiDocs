const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen.toString());
  });
}

// Close nav on link click (mobile)
if (navLinks) {
  navLinks.addEventListener("click", (event) => {
    if (event.target.tagName === "A" && navLinks.classList.contains("open")) {
      navLinks.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  });
}
