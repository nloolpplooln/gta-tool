/* ===== Donut Chart (Canvas) ===== */
window.GTA = window.GTA || {};

GTA.DonutChart = (function () {
  var canvas = null;
  var ctx = null;
  var animFrame = null;

  function init() {
    canvas = document.getElementById('donut-chart');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
  }

  /**
   * Draw the donut chart
   * @param {number} owned - Number of owned vehicles
   * @param {number} total - Total vehicles in catalog
   * @param {boolean} animated - Whether to animate the draw
   */
  function draw(owned, total, animated) {
    if (!canvas) init();
    if (!ctx) return;

    var w = canvas.width;
    var h = canvas.height;
    var centerX = w / 2;
    var centerY = h / 2;
    var radius = Math.min(centerX, centerY) - 12;
    var lineWidth = 18;

    // Cancel ongoing animation
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }

    var ratio = total > 0 ? owned / total : 0;
    var targetAngle = ratio * Math.PI * 2;

    if (!animated) {
      renderFrame(targetAngle, w, h, centerX, centerY, radius, lineWidth);
      return;
    }

    // Animate
    var startTime = null;
    var duration = 800;
    var startAngle = 0;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1.0);

      // Ease out cubic
      var ease = 1 - Math.pow(1 - progress, 3);
      var currentAngle = startAngle + (targetAngle - startAngle) * ease;

      renderFrame(currentAngle, w, h, centerX, centerY, radius, lineWidth);

      if (progress < 1.0) {
        animFrame = requestAnimationFrame(animate);
      }
    }

    animFrame = requestAnimationFrame(animate);
  }

  function renderFrame(angle, w, h, cx, cy, r, lw) {
    ctx.clearRect(0, 0, w, h);

    var startAngle = -Math.PI / 2;

    // Background ring (not owned)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#14141f';
    ctx.lineWidth = lw;
    ctx.stroke();

    if (angle > 0.001) {
      // Gold gradient ring (owned)
      var grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0, '#d4a843');
      grad.addColorStop(1, '#f0d68a');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + angle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Glow effect on the end cap
    if (angle > 0.05) {
      var endX = cx + Math.cos(startAngle + angle) * r;
      var endY = cy + Math.sin(startAngle + angle) * r;
      ctx.beginPath();
      ctx.arc(endX, endY, lw / 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f0d68a';
      ctx.shadowColor = 'rgba(212, 168, 67, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  return { init: init, draw: draw };
})();
