import { config } from "./config.js";
import { detectLanguage, translate } from "./i18n.js";
import { classify, matchingDetails, parseCertificateHash, withTimeout } from "./verification.js";
import { verifyOnChain } from "./chain.js";

const ICONS = {
  ok: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  warning: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><path d="M12 17h.01"/></svg>',
  cross: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

const $ = (id) => document.getElementById(id);
let language = detectLanguage(readSavedLanguage(), navigator.languages);
let lastResult = null;

function readSavedLanguage() {
  try { return localStorage.getItem("chambita.language"); } catch { return null; }
}

function t(key, values) {
  return translate(language, key, values);
}

function applyLanguage() {
  document.documentElement.lang = language === "es" ? "es-419" : "en-US";
  document.title = t("page.title");
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-label]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nLabel)); });
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  if (lastResult) renderResult(lastResult);
}

function formatDate(date) {
  return date ? new Intl.DateTimeFormat(language === "es" ? "es-PE" : "en-US", { dateStyle: "long" }).format(date) : "—";
}

async function fetchDetails(hash) {
  try {
    const response = await withTimeout(fetch(`${config.apiBaseUrl}/api/v1/public/certificates/${hash}`,
      { headers: { Accept: "application/json", "Accept-Language": language === "es" ? "es-419" : "en-US" } }),
      config.apiTimeoutMs);
    return response.ok ? matchingDetails(hash, await response.json()) : null;
  } catch {
    return null; // The API is optional: authenticity comes from the network (QA02).
  }
}

function showForm(error) {
  $("result").hidden = true;
  $("verify").hidden = false;
  $("form-error").hidden = !error;
  $("form-error").textContent = error ? t(error) : "";
  $("certificate-input").setAttribute("aria-invalid", String(Boolean(error)));
}

function renderResult({ hash, status, onChain, details }) {
  const card = $("result-card");
  const kind = { VALID: "valid", REVOKED: "revoked", NOT_AUTHENTIC: "invalid", ERROR: "error" }[status];
  card.className = `result result--${kind}`;
  $("result-icon").innerHTML = { valid: ICONS.ok, revoked: ICONS.warning, invalid: ICONS.cross, error: ICONS.warning }[kind];
  $("result-title").textContent = t(`result.${kind}.title`);
  $("result-text").textContent = t(`result.${kind}.text`, { date: formatDate(onChain?.revokedAt) });

  const registered = status === "VALID" || status === "REVOKED";
  $("result-body").hidden = !registered;
  if (registered) {
    $("result-project").textContent = details?.projectTitle ?? t("result.untitled");
    $("fact-category").hidden = !details;
    $("fact-score").hidden = !details;
    $("value-category").textContent = details ? t(`category.${details.category}`) : "";
    $("value-score").textContent = details ? t("result.scoreValue", { score: details.score }) : "";
    $("value-issued").textContent = formatDate(onChain.issuedAt);
    $("value-status").textContent = t(`status.${status}`);
    $("value-status").className = status === "REVOKED" ? "pill pill--revoked" : "pill";
    $("result-offline").hidden = Boolean(details);
    $("value-contract").textContent = config.contractAddress;
    $("value-token").textContent = `#${onChain.tokenId}`;
    $("value-hash").textContent = hash;
    const link = $("etherscan-link");
    if (details?.transactionHash) {
      link.href = `${config.explorerUrl}/tx/${details.transactionHash}`;
      link.textContent = t("result.etherscan");
    } else {
      link.href = `${config.explorerUrl}/address/${config.contractAddress}`;
      link.textContent = t("result.etherscanContract");
    }
  }
  $("verify").hidden = true;
  $("result").hidden = false;
  $("result-title").focus();
}

async function verify(input, { updateUrl }) {
  const hash = parseCertificateHash(input);
  if (!hash) {
    showForm("form.invalid");
    return;
  }
  const button = $("verify-button");
  button.disabled = true;
  button.textContent = t("form.verifying");
  try {
    const [onChain, details] = await Promise.all([
      verifyOnChain(hash, config).catch(() => null),
      fetchDetails(hash),
    ]);
    const status = onChain ? classify(onChain) : "ERROR";
    lastResult = { hash, status, onChain, details };
    if (updateUrl) history.pushState({ hash }, "", `?hash=${hash}`);
    renderResult(lastResult);
  } finally {
    button.disabled = false;
    button.textContent = t("form.submit");
  }
}

function init() {
  document.querySelectorAll("[data-link='landing']").forEach((link) => { link.href = config.landingUrl; });
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => {
    language = button.dataset.language;
    try { localStorage.setItem("chambita.language", language); } catch { /* optional */ }
    applyLanguage();
  }));
  $("verify-form").addEventListener("submit", (event) => {
    event.preventDefault();
    verify($("certificate-input").value, { updateUrl: true });
  });
  $("again-button").addEventListener("click", () => {
    lastResult = null;
    history.pushState({}, "", location.pathname);
    $("certificate-input").value = "";
    showForm(null);
    $("certificate-input").focus();
  });
  window.addEventListener("popstate", () => start());
  applyLanguage();
  start();
}

function start() {
  const hash = new URLSearchParams(location.search).get("hash");
  if (hash) {
    $("certificate-input").value = hash;
    verify(hash, { updateUrl: false });
  } else {
    lastResult = null;
    showForm(null);
  }
}

init();
