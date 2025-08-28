// HAMBURGER
document.addEventListener("DOMContentLoaded", () => {
    const hamburger = document.querySelector(".hamburger");
    const menu = document.querySelector(".hold3");
    const foldIcon = hamburger.querySelector("i:nth-child(1)");
    const unfoldIcon = document.querySelector(".hold3 .hamburger i");
  
    // Toggle menu on hamburger click
    hamburger.addEventListener("click", () => {
      menu.classList.toggle("open");
  
      // Toggle the visibility of the icons (show fold/unfold)
      if (menu.classList.contains("open")) {
        foldIcon.style.display = "none";
        unfoldIcon.style.display = "block"; // Show unfold icon when menu is open
      } else {
        foldIcon.style.display = "block";
        unfoldIcon.style.display = "none"; // Show fold icon when menu is closed
      }
    });
  
    // Close the menu when the unfold icon is clicked
    unfoldIcon.addEventListener("click", () => {
      menu.classList.remove("open");
      foldIcon.style.display = "block";
      unfoldIcon.style.display = "none";
    });
  });
  
  

  
  
  
  
  // SCROLL TO TOP BUTTON
  document.addEventListener("DOMContentLoaded", () => {
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  
    // Show the button when scrolling down, hide when at the top
    window.addEventListener("scroll", () => {
      if (window.scrollY > 200) {  // When the user scrolls down 200px
        scrollToTopBtn.classList.add("show");
      } else {
        scrollToTopBtn.classList.remove("show");
      }
    });
  
    // Scroll to the top of the page when the button is clicked
    scrollToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth" // Smooth scrolling
      });
    });
  });



