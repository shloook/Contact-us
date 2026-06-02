/**
 * AddMeBuddy Premium Website Logic
 * - Custom Cursor Follower (Lerp interpolation)
 * - Interactive 3D Particle Orb Canvas (Adaptive colors & drag-rotation)
 * - 3D Card Tilt & Radial Glow Spotlight
 * - Native Scroll Animation Fallback (IntersectionObserver)
 * - Adaptive Social Media Environmental Glow
 * - Automatic System Theme Synchronization & Toggler
 * - Form Validation & States
 */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  // initCustomCursor(); // Disabled to use normal system cursor
  initHero3DOrb();
  initScrollReveal();
  initScrollytelling();
  initJourneyTilt();
  initServicesTilt();
  initSocialAdaptation();
  initContactForm();
});

/* ==========================================================================
   1. Theme Synchronization (Light/Dark)
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');

  // Read saved selection or use system default
  const savedScheme = localStorage.getItem("color-scheme");
  
  if (savedScheme) {
    applyTheme(savedScheme);
  } else {
    // If no manual preference is pinned, match system preferred color scheme
    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(systemIsDark ? "dark" : "light");
  }

  // Click listener for manual toggle (toggles between light and dark, pins the selection)
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || 
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    localStorage.setItem("color-scheme", newTheme); // Pin selection
  });

  // Listen to system changes and adapt automatically ONLY IF user hasn't pinned theme manually
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("color-scheme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    
    if (metaColorScheme) {
      metaColorScheme.content = theme === "dark" ? "dark" : "light";
    }

    // Trigger canvas recoloring if orb is running
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
  }
}

/* ==========================================================================
   2. Custom Interactive Cursor
   ========================================================================== */
function initCustomCursor() {
  const cursor = document.getElementById("custom-cursor");
  const dot = document.getElementById("custom-cursor-dot");
  
  if (!cursor || !dot) return;

  let mouseX = 0, mouseY = 0; // Current mouse position
  let cursorX = 0, cursorY = 0; // Interpolated cursor position
  let dotX = 0, dotY = 0; // Interpolated dot position

  // Linear Interpolation (lerp) constants for soft organic lag
  const easeOuter = 0.15;
  const easeInner = 0.35;
  let isMouseMoving = false;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    if (!isMouseMoving) {
      isMouseMoving = true;
      cursor.style.opacity = "1";
      dot.style.opacity = "1";
    }
  });

  // Fade out cursor when mouse leaves the page
  document.addEventListener("mouseleave", () => {
    cursor.style.opacity = "0";
    dot.style.opacity = "0";
    isMouseMoving = false;
  });

  // Draw loop for custom cursor follower
  function updateCursor() {
    if (isMouseMoving) {
      // Outer ring interpolation
      cursorX += (mouseX - cursorX) * easeOuter;
      cursorY += (mouseY - cursorY) * easeOuter;
      
      // Inner dot interpolation (snappier)
      dotX += (mouseX - dotX) * easeInner;
      dotY += (mouseY - dotY) * easeInner;

      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      
      dot.style.left = `${dotX}px`;
      dot.style.top = `${dotY}px`;
    }
    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Highlight effect when hovering over interactive elements
  const hoverables = document.querySelectorAll("a, button, select, input, textarea, [role='button'], .social-card");
  
  hoverables.forEach(item => {
    item.addEventListener("mouseenter", () => {
      cursor.classList.add("hovering");
      dot.classList.add("hovering");
    });
    item.addEventListener("mouseleave", () => {
      cursor.classList.remove("hovering");
      dot.classList.remove("hovering");
    });
  });
}

/* ==========================================================================
   3. Interactive 3D Particle Orb Canvas (Hero visual)
   ========================================================================== */
function initHero3DOrb() {
  const canvas = document.getElementById("hero-canvas");
  const slot = document.getElementById("hero-3d-slot");
  if (!canvas || !slot) return;

  const ctx = canvas.getContext("2d");
  let width, height;
  let devicePixelRatio = window.devicePixelRatio || 1;

  // Set size based on container bounding box
  function resizeCanvas() {
    const rect = slot.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Math variables
  const numParticles = 300;
  const sphereRadius = 360;
  const fov = 650; // Field of View (Perspective projection factor)
  let particles = [];

  // Drag interaction variables
  let rotationX = 0.005;
  let rotationY = 0.005;
  let targetRotationX = 0.005;
  let targetRotationY = 0.005;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Mouse repulsion coordinates
  let canvasMouseX = 0;
  let canvasMouseY = 0;
  let isMouseOverCanvas = false;

  // Colors linked to CSS brand variables
  let primaryColor = "#6366f1";
  let accentColor = "#06b6d4";

  function fetchThemeColors() {
    const rootStyle = getComputedStyle(document.documentElement);
    primaryColor = rootStyle.getPropertyValue("--color-primary").trim() || "#6366f1";
    accentColor = rootStyle.getPropertyValue("--color-accent").trim() || "#06b6d4";
  }
  fetchThemeColors();

  window.addEventListener("themeChanged", () => {
    // Delay slightly to allow root attributes to compute
    setTimeout(fetchThemeColors, 100);
  });

  // Particle constructor
  class Particle {
    constructor() {
      // Uniform distribution on a sphere surface (Fibonacci spiral method)
      this.theta = Math.random() * Math.PI * 2;
      this.phi = Math.acos(Math.random() * 2 - 1);
      
      // Calculate 3D coordinates
      this.x = sphereRadius * Math.sin(this.phi) * Math.cos(this.theta);
      this.y = sphereRadius * Math.sin(this.phi) * Math.sin(this.theta);
      this.z = sphereRadius * Math.cos(this.phi);

      this.size = Math.random() * 2 + 1.5;
      
      // Speed offsets
      this.autoRotationSpeedX = (Math.random() - 0.5) * 0.001;
      this.autoRotationSpeedY = (Math.random() - 0.5) * 0.001;

      // Mouse offsets (repulsion)
      this.offsetX = 0;
      this.offsetY = 0;
      this.offsetZ = 0;
    }

    rotate(angleX, angleY) {
      // Rotate around X-axis
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      let y1 = this.y * cosX - this.z * sinX;
      let z1 = this.z * cosX + this.y * sinX;
      
      // Rotate around Y-axis
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      let x2 = this.x * cosY + z1 * sinY;
      let z2 = z1 * cosY - this.x * sinY;

      this.x = x2;
      this.y = y1;
      this.z = z2;
    }

    draw() {
      // Calculate projection
      const totalX = this.x + this.offsetX;
      const totalY = this.y + this.offsetY;
      const totalZ = this.z + this.offsetZ;

      // Perspective divide
      const scale = fov / (fov + totalZ);
      const projX = totalX * scale + width / 2;
      const projY = totalY * scale + height / 2;

      if (projX < 0 || projX > width || projY < 0 || projY > height) return;

      // Depth sizing and opacity mapping
      const sizeVal = this.size * scale;
      const zPercent = (totalZ + sphereRadius) / (sphereRadius * 2); // 0 (front) to 1 (back)
      const opacity = Math.max(0.08, 0.9 - zPercent * 0.8);

      ctx.beginPath();
      ctx.arc(projX, projY, sizeVal, 0, Math.PI * 2);

      // Gradient color matching front/back distribution
      ctx.fillStyle = zPercent < 0.5 ? primaryColor : accentColor;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Store projected coordinates for drawing connecting web/grid lines
      this.projX = projX;
      this.projY = projY;
      this.depth = totalZ;
    }
  }

  // Populate particles
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle());
  }

  // Drag listeners
  slot.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      
      targetRotationY = deltaX * 0.007;
      targetRotationX = -deltaY * 0.007;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }

    // Hover coordinates within canvas bounds
    const rect = canvas.getBoundingClientRect();
    canvasMouseX = e.clientX - rect.left;
    canvasMouseY = e.clientY - rect.top;
    
    isMouseOverCanvas = (
      canvasMouseX >= 0 && 
      canvasMouseX <= rect.width && 
      canvasMouseY >= 0 && 
      canvasMouseY <= rect.height
    );
  });

  // Touch support for drag
  slot.addEventListener("touchstart", (e) => {
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  });

  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  window.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length > 0) {
      const deltaX = e.touches[0].clientX - lastMouseX;
      const deltaY = e.touches[0].clientY - lastMouseY;
      
      targetRotationY = deltaX * 0.008;
      targetRotationX = -deltaY * 0.008;

      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    }
  });

  // Rendering Loop
  function render() {
    ctx.clearRect(0, 0, width, height);

    // Damping on rotations (smooth release)
    rotationX += (targetRotationX - rotationX) * 0.1;
    rotationY += (targetRotationY - rotationY) * 0.1;

    // Slow ambient rotation constant
    targetRotationX += (0.0004 - targetRotationX) * 0.05;
    targetRotationY += (0.0006 - targetRotationY) * 0.05;

    // Repulsion force math from mouse cursor
    particles.forEach(p => {
      // Rotation application
      p.rotate(rotationX, rotationY);

      if (isMouseOverCanvas && !isDragging) {
        // Find distance to mouse in 2D projection space
        const dx = p.projX - canvasMouseX;
        const dy = p.projY - canvasMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 160) {
          // Push particles slightly away based on proximity
          const force = (160 - dist) / 160;
          const angle = Math.atan2(dy, dx);
          
          p.offsetX += (Math.cos(angle) * force * 15 - p.offsetX) * 0.1;
          p.offsetY += (Math.sin(angle) * force * 15 - p.offsetY) * 0.1;
        } else {
          // Slide back to base orbit
          p.offsetX += (0 - p.offsetX) * 0.1;
          p.offsetY += (0 - p.offsetY) * 0.1;
        }
      } else {
        p.offsetX += (0 - p.offsetX) * 0.15;
        p.offsetY += (0 - p.offsetY) * 0.15;
      }
    });

    // Painters algorithm: sort particles back-to-front (Z axis) before drawing
    particles.sort((a, b) => b.depth - a.depth);

    // Draw connection webbing lines for neighboring points
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      
      // Connect to a few adjacent particles to limit draw calls and keep it minimal
      let connectionCount = 0;
      for (let j = i + 1; j < particles.length; j++) {
        if (connectionCount > 2) break; // Limit web lines
        
        const p2 = particles[j];
        
        // 3D Distance check
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 75) {
          const zPercent = (p1.depth + p2.depth) / 2 + sphereRadius;
          const opacity = Math.max(0, 0.18 - (zPercent / (sphereRadius * 2)) * 0.16);

          if (opacity > 0) {
            ctx.beginPath();
            ctx.moveTo(p1.projX, p1.projY);
            ctx.lineTo(p2.projX, p2.projY);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            connectionCount++;
          }
        }
      }
    }

    // Render individual nodes
    particles.forEach(p => p.draw());

    requestAnimationFrame(render);
  }
  render();
}

/* ==========================================================================
   4. Initial Page Load Scroll Reveal Animations
   ========================================================================== */
function initScrollReveal() {
  const revealItems = document.querySelectorAll(".reveal-item");
  
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target); // Trigger only once
      }
    });
  }, observerOptions);

  revealItems.forEach(item => {
    observer.observe(item);
  });
}

/* ==========================================================================
   5. Scrollytelling Timeline & Fallback Implementation
   ========================================================================== */
function initScrollytelling() {
  const container = document.querySelector(".scrollytelling-container");
  const textBlocks = document.querySelectorAll("#tracked .text-block");
  const visualCards = document.querySelectorAll(".visual-card");
  const ambient = document.getElementById("journey-ambient");

  if (!container || textBlocks.length === 0 || visualCards.length === 0) return;

  // Step ambient background glow colors
  const stepGlowColors = {
    1: "radial-gradient(circle at center, rgba(79, 70, 229, 0.25) 0%, transparent 70%)", // Indigo
    2: "radial-gradient(circle at center, rgba(6, 182, 212, 0.25) 0%, transparent 70%)",  // Cyan
    3: "radial-gradient(circle at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%)", // Green
    4: "radial-gradient(circle at center, rgba(236, 72, 153, 0.25) 0%, transparent 70%)"  // Pink
  };

  // Helper to dynamically update 3D card deck stack classes
  function updateCardStack(activeStep) {
    visualCards.forEach(card => {
      const cardStep = parseInt(card.getAttribute("data-step"));
      
      // Clear previous classes
      card.classList.remove("past", "active", "future-1", "future-2", "future-3");
      
      if (cardStep < activeStep) {
        card.classList.add("past");
      } else if (cardStep === activeStep) {
        card.classList.add("active");
      } else {
        const diff = cardStep - activeStep;
        if (diff === 1) card.classList.add("future-1");
        else if (diff === 2) card.classList.add("future-2");
        else card.classList.add("future-3");
      }
    });
  }

  // Initialize stack representation on load
  updateCardStack(1);

  // Setup highlights, glow transitions, and card stack positioning
  const scrollTrackerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const step = parseInt(entry.target.getAttribute("data-step"));
        
        // Highlight active text block
        textBlocks.forEach(block => block.classList.remove("focused"));
        entry.target.classList.add("focused");

        // Adapt ambient glow background
        if (ambient && stepGlowColors[step]) {
          ambient.style.background = stepGlowColors[step];
        }

        // Update card stack positioning
        updateCardStack(step);
      }
    });
  }, {
    root: null,
    rootMargin: "-40% 0px -40% 0px", // Trigger when block is in vertical center
    threshold: 0.1
  });

  textBlocks.forEach(block => scrollTrackerObserver.observe(block));
}

/* ==========================================================================
   5b. Journey Card Active Tilt & Glow Tracker
   ========================================================================== */
function initJourneyTilt() {
  const cards = document.querySelectorAll(".visual-card");
  
  cards.forEach(card => {
    const glow = card.querySelector(".card-glow-tracker");

    card.addEventListener("mousemove", (e) => {
      // Only apply tilt if the card is currently active
      if (!card.classList.contains("active")) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (glow) {
        card.style.setProperty("--glow-x", `${x}px`);
        card.style.setProperty("--glow-y", `${y}px`);
      }

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 10; // Max Y rotation angle: 10 degrees
      const rotateX = -((y - centerY) / centerY) * 10; // Max X rotation angle: 10 degrees

      // Keep translateY(0) and translateZ(0) to override default .active transform stack
      card.style.transform = `translateY(0) translateZ(20px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      if (!card.classList.contains("active")) return;
      card.style.transform = "translateY(0) translateZ(0) rotateX(0deg) rotateY(0deg) scale(1)";
    });
  });
}

/* ==========================================================================
   6. Premium Services Card Mouse glow & 3D Tilt
   ========================================================================== */
function initServicesTilt() {
  const cards = document.querySelectorAll(".service-card");
  
  cards.forEach(card => {
    const glow = card.querySelector(".card-glow-tracker");

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      
      // Calculate mouse coordinates relative to the card dimensions
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update custom properties on card element (CSS radial gradient spotlight follows mouse)
      if (glow) {
        card.style.setProperty("--glow-x", `${x}px`);
        card.style.setProperty("--glow-y", `${y}px`);
      }

      // Calculate tilt based on distance from center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 8; // Max Y rotation angle: 8 degrees
      const rotateX = -((y - centerY) / centerY) * 8; // Max X rotation angle: 8 degrees

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    // Reset coordinates and transforms on leave
    card.addEventListener("mouseleave", () => {
      card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
    });
  });
}

/* ==========================================================================
   7. Social Hub Environment Custom Glow Adapters
   ========================================================================== */
function initSocialAdaptation() {
  const socialSection = document.getElementById("social-section");
  const socialCards = document.querySelectorAll(".social-card");

  if (!socialSection || socialCards.length === 0) return;

  socialCards.forEach(card => {
    const brand = card.getAttribute("data-brand");

    card.addEventListener("mouseenter", () => {
      // Clear previous hover classes
      socialSection.className = "social-section";
      // Add dynamic modifier class
      socialSection.classList.add(`${brand}-active`);
    });

    card.addEventListener("mouseleave", () => {
      socialSection.className = "social-section";
    });
  });
}

/* ==========================================================================
   8. Connect Form Submissions and success state
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById("consultation-form");
  const status = document.getElementById("form-status");

  if (!form || !status) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Visual button loading state
    const submitBtn = form.querySelector(".btn-submit");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Scheduling Buddy...</span>`;

    // Build form submission payload for Web3Forms (automatically includes access_key from HTML)
    const formData = new FormData(form);
    formData.append("subject", "New Study Abroad Consultation Request - AddMeBuddy");
    formData.append("from_name", "AddMeBuddy Website Portal");

    // Perform live fetch request to Web3Forms API
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        status.className = "form-status success";
        status.textContent = "✓ Consultation Request Scheduled. Speak to your buddy soon!";
        form.reset();
      } else {
        status.className = "form-status error";
        status.textContent = `✗ Submission failed: ${data.message || "Unknown error"}`;
      }
    })
    .catch(error => {
      status.className = "form-status error";
      status.textContent = "✗ Network error. Please check your internet connection.";
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      
      // Clear status banner after 6s
      setTimeout(() => {
        status.textContent = "";
        status.className = "form-status";
      }, 6000);
    });
  });
}
