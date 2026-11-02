/*
 * KEYNESLAB - estensione didattica per Snap!
 * Integra un pannello GeoGebra nella stessa pagina dell'IDE Snap!
 *
 * Uso:
 * 1) Abilitare in Snap! Settings > JavaScript extensions.
 * 2) Caricare questo file con il blocco src_load(URL_DEL_FILE).
 * 3) Usare i blocchi "extension" (o blocchi personalizzati che li racchiudono).
 *
 * NOTA: il file deve essere raggiungibile via HTTPS e consentire il caricamento
 * cross-origin. Per una distribuzione stabile usare un URL GitHub Pages o
 * un server locale che ospiti anche Snap! sullo stesso origin.
 */

(function () {
    "use strict";

    var api = null;
    var applet = null;
    var loading = false;
    var loadError = "";
    var panelId = "keyneslab-geogebra-panel";
    var defaults = {c0: 100, prop: 0.8, tass: 100, inv: 150, sp: 200};

    function panel() {
        return document.getElementById(panelId);
    }

    function status(message) {
        var p = panel();
        if (!p) return;
        var s = p.querySelector("#keyneslab-status");
        if (s) s.textContent = message;
    }

    function ensurePanel() {
        var p = panel();
        if (p) return p;

        p = document.createElement("section");
        p.id = panelId;
        p.style.cssText = [
            "position:fixed",
            "right:12px",
            "top:72px",
            "width:min(760px,54vw)",
            "height:min(590px,72vh)",
            "z-index:999999",
            "background:#ffffff",
            "border:2px solid #315b78",
            "border-radius:10px",
            "box-shadow:0 8px 28px rgba(0,0,0,.28)",
            "display:flex",
            "flex-direction:column",
            "overflow:hidden",
            "font:14px system-ui,sans-serif"
        ].join(";");

        var header = document.createElement("div");
        header.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 12px;background:#244e68;color:white;font-weight:700";
        header.innerHTML = '<span style="flex:1">KEYNESLAB · GeoGebra</span>' +
            '<span id="keyneslab-status" style="font-weight:400;font-size:12px">Inizializzazione…</span>' +
            '<button id="keyneslab-hide" title="Nascondi pannello" style="border:0;border-radius:5px;padding:4px 9px;cursor:pointer">Nascondi</button>';
        p.appendChild(header);

        var app = document.createElement("div");
        app.id = "keyneslab-ggb";
        app.style.cssText = "flex:1;min-height:0;width:100%";
        p.appendChild(app);

        document.body.appendChild(p);
        header.querySelector("#keyneslab-hide").addEventListener("click", function () {
            p.style.display = "none";
        });
        return p;
    }

    function initialiseConstruction(ggb) {
        api = ggb;
        api.setErrorDialogsActive(false);
        api.evalCommand(
            "C0=100\n" +
            "prop=0.8\n" +
            "Tass=100\n" +
            "Inv=150\n" +
            "SpPub=200\n" +
            "Dom(x)=C0+prop*(x-Tass)+Inv+SpPub\n" +
            "bis(x)=x\n" +
            "Equilibrio=Intersect(Dom,bis)\n" +
            "Yeq=(C0-prop*Tass+Inv+SpPub)/(1-prop)\n" +
            "mol=1/(1-prop)"
        );
        api.setCoordSystem(0, 2500, 0, 2500);
        api.setAxesVisible(true, true);
        api.setGridVisible(true);
        api.setLabelVisible("Equilibrio", true);
        api.setLabelStyle("Equilibrio", 1);
        api.setPointSize("Equilibrio", 7);
        api.setColor("Dom", 30, 105, 170);
        api.setColor("bis", 190, 75, 65);
        api.setColor("Equilibrio", 30, 145, 85);
        status("GeoGebra pronto · Y* = " + Math.round(api.getValue("Yeq") * 100) / 100);
    }

    function loadScript(url, callback) {
        var existing = document.querySelector('script[data-keyneslab-ggb="yes"]');
        if (existing) {
            if (window.GGBApplet) callback();
            else existing.addEventListener("load", callback, {once: true});
            return;
        }
        var s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.dataset.keyneslabGgb = "yes";
        s.onload = callback;
        s.onerror = function () {
            loading = false;
            loadError = "Non riesco a caricare deployggb.js: controllare la connessione.";
            status(loadError);
        };
        document.head.appendChild(s);
    }

    function init() {
        ensurePanel().style.display = "flex";
        if (api) {
            status("GeoGebra già pronto");
            return true;
        }
        if (loading) {
            status("Caricamento in corso…");
            return false;
        }
        loading = true;
        status("Caricamento di GeoGebra…");
        loadScript("https://www.geogebra.org/apps/deployggb.js", function () {
            if (!window.GGBApplet) {
                loading = false;
                loadError = "Libreria GeoGebra non disponibile.";
                status(loadError);
                return;
            }
            applet = new GGBApplet({
                appName: "graphing",
                width: 720,
                height: 520,
                showToolBar: false,
                showAlgebraInput: false,
                showMenuBar: false,
                showResetIcon: true,
                enableRightClick: false,
                showZoomButtons: true,
                appletOnLoad: function (ggb) {
                    loading = false;
                    initialiseConstruction(ggb);
                }
            }, true);
            applet.inject("keyneslab-ggb");
        });
        return false;
    }

    function setParams(c0, prop, tass, inv, sp) {
        if (!api) {
            status("Prima inizializzare GeoGebra");
            return false;
        }
        var vals = [c0, prop, tass, inv, sp].map(Number);
        if (!vals.every(Number.isFinite) || vals[1] < 0 || vals[1] >= 1) {
            status("Parametri non validi: 0 ≤ propensione < 1");
            return false;
        }
        api.setValue("C0", vals[0]);
        api.setValue("prop", vals[1]);
        api.setValue("Tass", vals[2]);
        api.setValue("Inv", vals[3]);
        api.setValue("SpPub", vals[4]);
        status("Parametri aggiornati · Y* = " + (Math.round(api.getValue("Yeq") * 100) / 100));
        return true;
    }

    function readY() {
        return api ? api.getValue("Yeq") : -1;
    }

    function readK() {
        return api ? api.getValue("mol") : -1;
    }

    function show() {
        var p = ensurePanel();
        p.style.display = "flex";
        if (!api && !loading) init();
        return true;
    }

    function hide() {
        var p = panel();
        if (p) p.style.display = "none";
        return true;
    }

    // Funzione di registrazione corretta per Snap!
    function register(name, fn) {
        SnapExtensions.primitives.set(name, function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(this, args);
        });
    }

    // Registrazione dei blocchi con la sintassi corretta di Snap! (senza parentesi vuote, con % per i parametri)
    register("key_init", function () { return init(); });
    register("key_ready?", function () { return !!api; });
    register("key_set %c0 %prop %tass %inv %sp", function (c0, prop, tass, inv, sp) {
        return setParams(c0, prop, tass, inv, sp);
    });
    register("key_y_equilibrio", function () { return readY(); });
    register("key_moltiplicatore", function () { return readK(); });
    register("key_mostra", function () { return show(); });
    register("key_nascondi", function () { return hide(); });
    register("key_errore", function () { return loadError; });

}());
