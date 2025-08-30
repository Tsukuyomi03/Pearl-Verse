$(document).ready(function () {
  initScrollReveal();

  initParticles();

  initSmoothScrolling();

  initNavbarEffects();
});

function initScrollReveal() {
  const revealElements = document.querySelectorAll(".feature-card, .stat-item");

  const revealElementOnScroll = () => {
    revealElements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150;

      if (elementTop < window.innerHeight - elementVisible) {
        element.classList.add("scroll-reveal", "revealed");
      }
    });
  };

  window.addEventListener("scroll", revealElementOnScroll);
  revealElementOnScroll();
}

function initParticles() {
  const particlesContainer = document.querySelector(".particles");

  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      createDynamicParticle();
    }, i * 500);
  }

  function createDynamicParticle() {
    const particle = document.createElement("div");
    particle.className = "particle";

    particle.style.left = Math.random() * 100 + "%";
    particle.style.top = Math.random() * 100 + "%";

    const colors = [
      "var(--neon-blue)",
      "var(--neon-pink)",
      "var(--gold)",
      "var(--neon-purple)",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.background = randomColor;
    particle.style.boxShadow = `0 0 10px ${randomColor}`;

    particle.style.animationDuration = 4 + Math.random() * 4 + "s";
    particle.style.animationDelay = Math.random() * 2 + "s";

    particlesContainer.appendChild(particle);

    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
      createDynamicParticle(); // Create new particle
    }, 8000);
  }
}

function initSmoothScrolling() {
  $('a[href^="#"]').on("click", function (e) {
    e.preventDefault();

    const target = $(this.getAttribute("href"));
    if (target.length) {
      $("html, body").animate(
        {
          scrollTop: target.offset().top - 80,
        },
        800,
        "easeInOutCubic"
      );
    }
  });
}

function initNavbarEffects() {
  $(window).scroll(function () {
    const scrollTop = $(window).scrollTop();
    const navbar = $(".glass-nav");

    if (scrollTop > 50) {
      navbar.addClass("scrolled");
    } else {
      navbar.removeClass("scrolled");
    }
  });
}

$(".feature-card").on("mouseenter", function () {
  $(this).find(".feature-icon").addClass("animate__animated animate__pulse");
});

$(".feature-card").on("mouseleave", function () {
  $(this).find(".feature-icon").removeClass("animate__animated animate__pulse");
});

$(".btn-feature").on("click", function (e) {
  e.preventDefault();

  const buttonText = $(this).text();

  Swal.fire({
    title: "Feature Coming Soon!",
    text: `The "${buttonText}" feature will be available soon. Join our community to get early access!`,
    icon: "info",
    confirmButtonText: "Join Beta",
    showCancelButton: true,
    cancelButtonText: "Later",
    background: "rgba(26, 13, 46, 0.95)",
    color: "#ffffff",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "/register";
    }
  });
});

function animateStats() {
  $(".stat-number").each(function () {
    const $this = $(this);
    const countTo = parseInt($this.text().replace(/[^0-9]/g, ""));
    const suffix = $this.text().replace(/[0-9]/g, "");

    $this.prop("counter", 0).animate(
      {
        counter: countTo,
      },
      {
        duration: 2000,
        easing: "swing",
        step: function (now) {
          $this.text(Math.ceil(now) + suffix);
        },
      }
    );
  });
}

const statsSection = document.querySelector(".stats-section");
if (statsSection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateStats();
        observer.unobserve(entry.target);
      }
    });
  });

  observer.observe(statsSection);
}

function initTypingEffect() {
  const taglineElement = document.querySelector(".hero-tagline");
  if (!taglineElement) return;

  const textElements = taglineElement.querySelectorAll("span");

  textElements.forEach((element, elementIndex) => {
    const text = element.textContent;
    element.textContent = "";
    element.style.opacity = "0";

    setTimeout(() => {
      element.style.opacity = "1";
      let index = 0;

      function typeWriter() {
        if (index < text.length) {
          element.textContent += text.charAt(index);
          index++;
          setTimeout(typeWriter, 50);
        }
      }

      typeWriter();
    }, elementIndex * 1000);
  });
}

$(window).on("load", function () {
  setTimeout(initTypingEffect, 500);
});

let konamiCode = [];
const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

$(document).keydown(function (e) {
  konamiCode.push(e.keyCode);

  if (konamiCode.length > konamiSequence.length) {
    konamiCode.shift();
  }

  if (JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
    triggerEasterEgg();
    konamiCode = [];
  }
});

function triggerEasterEgg() {
  Swal.fire({
    title: "🎮 KONAMI CODE ACTIVATED! 🎮",
    html: `
            <div style="text-align: center;">
                <i class="fas fa-gem" style="font-size: 3rem; color: var(--gold); animation: rotate-glow 1s linear infinite;"></i>
                <p style="margin-top: 15px; color: var(--neon-blue);">You've unlocked a special bonus!</p>
                <p style="color: var(--gold); font-weight: bold;">+1000 Pearl Coins when you register!</p>
            </div>
        `,
    showConfirmButton: true,
    confirmButtonText: "Claim Bonus",
    background: "rgba(26, 13, 46, 0.95)",
    backdrop: "rgba(0, 0, 0, 0.9)",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "/register?bonus=konami";
    }
  });
}

let mouseTrail = [];

$(document).mousemove(function (e) {
  mouseTrail.push({ x: e.pageX, y: e.pageY });

  if (mouseTrail.length > 5) {
    mouseTrail.shift();
  }

  $(".mouse-trail").remove();

  mouseTrail.forEach((point, index) => {
    const trailDot = $('<div class="mouse-trail"></div>');
    trailDot.css({
      position: "fixed",
      left: point.x - 2,
      top: point.y - 2,
      width: 4 - index,
      height: 4 - index,
      background: "var(--neon-blue)",
      borderRadius: "50%",
      pointerEvents: "none",
      zIndex: 9999,
      opacity: (5 - index) / 5,
      boxShadow: "0 0 5px var(--neon-blue)",
    });

    $("body").append(trailDot);

    trailDot.animate({ opacity: 0 }, 500, function () {
      $(this).remove();
    });
  });
});

$(".social-link").on("click", function (e) {
  e.preventDefault();

  const platform = $(this).find("i").attr("class").split("fa-")[1];

  Swal.fire({
    title: `Connect on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
    text: "Social media integration coming soon! Join our beta to get notified.",
    icon: "info",
    confirmButtonText: "Join Beta",
    showCancelButton: true,
    cancelButtonText: "Later",
    background: "rgba(26, 13, 46, 0.95)",
    color: "#ffffff",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "/register";
    }
  });
});

$(".btn-feature, .btn-game").hover(
  function () {
    $(this).addClass("animate__animated animate__pulse");
  },
  function () {
    $(this).removeClass("animate__animated animate__pulse");
  }
);

function initRandomGlowShift() {
  setInterval(() => {
    const glowElements = document.querySelectorAll(".glow-text, .glow-icon");
    glowElements.forEach((element) => {
      const hueShift = Math.random() * 60 - 30; // Random shift between -30 and 30
      element.style.filter = `hue-rotate(${hueShift}deg)`;
    });
  }, 3000);
}

initRandomGlowShift();

$(window).resize(function () {
  $(".particle").each(function (index) {
    $(this).css({
      left: Math.random() * 100 + "%",
      top: Math.random() * 100 + "%",
    });
  });
});

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    $("*").css("animation-play-state", "paused");
  } else {
    $("*").css("animation-play-state", "running");
  }
});

$(window).on("load", function () {
  $(".loading-screen").fadeOut(500);

  $(".hero-section").addClass("animate__animated animate__fadeIn");

  $(".feature-card").each(function (index) {
    setTimeout(() => {
      $(this).addClass("animate__animated animate__fadeInUp");
    }, index * 200);
  });
});

window.onerror = function (msg, url, lineNo, columnNo, error) {
  return false;
};
