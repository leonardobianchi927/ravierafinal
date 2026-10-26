// Modo escuro/claro: lembra a escolha do visitante neste navegador (padrão: escuro)
(function () {
  var K = "tema-raviera", r = document.documentElement, t = null;
  try { t = localStorage.getItem(K); } catch (e) {}
  if (t !== "light" && t !== "dark") t = "dark";
  r.setAttribute("data-theme", t);
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("tema"); if (!b) return;
    function rotulo() {
      var escuro = r.getAttribute("data-theme") === "dark";
      b.textContent = escuro ? "Modo claro" : "Modo escuro";
      b.setAttribute("aria-label", escuro ? "Ativar modo claro" : "Ativar modo escuro");
    }
    rotulo();
    b.addEventListener("click", function () {
      var n = r.getAttribute("data-theme") === "dark" ? "light" : "dark";
      r.setAttribute("data-theme", n);
      try { localStorage.setItem(K, n); } catch (e) {}
      rotulo();
    });
  });
})();
