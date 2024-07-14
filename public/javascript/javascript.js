document.addEventListener("DOMContentLoaded", function() {
    const menuIcon = document.querySelector(".menu-icon");
    const links = document.querySelector(".links");
    const userSystem = document.querySelector(".userSystem");

    menuIcon.addEventListener("click", function() {
        links.classList.toggle("active");
        userSystem.classList.toggle("active");
    });
});