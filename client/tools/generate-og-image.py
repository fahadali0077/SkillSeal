"""Renders the Open Graph card at exactly 1200x630 using the redesign's tokens
and self-hosted typefaces (Google Fonts is unreachable here).

The card's job is the same as the landing hero's: show the artifact you get,
not a claim about a feature. It has to survive being displayed ~500px wide in
a Slack or iMessage unfurl, so type is large and the rules are hairline-but-visible.
"""
import base64, json, pathlib
from playwright.sync_api import sync_playwright

FONTS = json.loads(pathlib.Path('/tmp/fonts/embed.json').read_text())
OUT = pathlib.Path('/home/claude/work/current/SkillSeal/client/public')

def face(family, weight, key):
    return f"""@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};
      src:url(data:font/woff2;base64,{FONTS[key]}) format('woff2');}}"""

FONT_CSS = "".join([
    face('Newsreader', 400, 'Newsreader-400'),
    face('Newsreader', 500, 'Newsreader-500'),
    face('Public Sans', 400, 'PublicSans-400'),
    face('Public Sans', 600, 'PublicSans-600'),
    face('JetBrains Mono', 400, 'JetBrains-400'),
    face('JetBrains Mono', 500, 'JetBrains-500'),
])

SEAL = """
<svg width="{s}" height="{s}" viewBox="0 0 32 32" fill="none" style="display:block">
  <circle cx="16" cy="16" r="16" fill="#8A1F2F"/>
  <circle cx="16" cy="16" r="12.5" stroke="#C98A93" stroke-width="1.1"
          stroke-dasharray="2.6 2.4" stroke-linecap="round" opacity="0.85"/>
  <text x="16" y="16" text-anchor="middle" dominant-baseline="central" fill="#FBF9F6"
        font-family="Newsreader, Georgia, serif" font-weight="500" font-size="17"
        letter-spacing="-0.01em">S</text>
</svg>"""

HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>
{FONT_CSS}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1200px;height:630px;background:#FBF9F6;font-family:'Public Sans',sans-serif;
     color:#0A1520;-webkit-font-smoothing:antialiased;overflow:hidden}}
.wrap{{width:1200px;height:630px;padding:48px 60px 44px;display:flex;flex-direction:column;
      gap:34px}}
.label{{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;
       letter-spacing:0.14em;text-transform:uppercase;color:#7C8DA1}}
.label-seal{{color:#8A1F2F}}
.mono{{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}}
.serif{{font-family:'Newsreader',Georgia,serif;font-weight:400;letter-spacing:-0.02em}}
.rule{{height:1px;background:#E6E0D6}}
</style></head><body><div class="wrap">

  <!-- masthead -->
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:14px">
      {SEAL.format(s=44)}
      <span class="serif" style="font-weight:500;font-size:36px;letter-spacing:-0.015em">SkillSeal</span>
    </div>
    <span class="label">Proctored skill credentials</span>
  </div>

  <!-- body: statement + artifact -->
  <div style="display:grid;grid-template-columns:1fr 424px;gap:52px;align-items:center;flex:1;min-height:0">
    <div>
      <h1 class="serif" style="font-size:64px;line-height:1.0">
        A skill claim<br>anyone can look up.
      </h1>
      <p style="font-size:21px;line-height:1.5;color:#4A5F79;margin-top:22px;max-width:30ch">
        Sit a monitored assessment. Pass, and we issue a certificate
        with a public verification page.
      </p>
    </div>

    <!-- the artifact -->
    <div style="background:#fff;border:1px solid #D6CEC1;border-radius:8px;overflow:hidden;
                box-shadow:0 4px 18px rgba(14,26,43,0.06)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;
                  padding:14px 20px;border-bottom:1px solid #E6E0D6">
        <span class="label" style="font-size:11px">Certificate</span>
        <span class="mono" style="font-size:13px;color:#5A7089">SKL-2F91-A7C4-0Q</span>
      </div>
      <div style="padding:24px 20px">
        <div style="display:flex;gap:18px;align-items:flex-start">
          {SEAL.format(s=64)}
          <div style="min-width:0">
            <p class="label" style="font-size:11px">Issued to</p>
            <p class="serif" style="font-size:32px;line-height:1;margin-top:7px">Fahad Ali</p>
            <p class="label" style="font-size:11px;margin-top:18px">For</p>
            <p class="serif" style="font-size:32px;line-height:1;margin-top:7px">
              Docker <span style="font-family:'Public Sans';font-weight:600;font-size:19px;color:#4A5F79">Advanced</span>
            </p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;
                    margin-top:26px;padding-top:20px;border-top:1px solid #E6E0D6">
          <div>
            <p class="label" style="font-size:11px">Score</p>
            <p style="margin-top:8px"><span class="mono" style="font-size:30px;line-height:1">92</span><span class="mono" style="font-size:14px;color:#7C8DA1">/100</span></p>
          </div>
          <div>
            <p class="label" style="font-size:11px">Integrity</p>
            <p class="mono" style="font-size:17px;color:#1D7A4C;margin-top:11px;line-height:1">Clean</p>
          </div>
          <div>
            <p class="label" style="font-size:11px">Valid to</p>
            <p class="mono" style="font-size:17px;margin-top:11px;line-height:1">2028-03</p>
          </div>
        </div>
      </div>
      <div style="padding:12px 20px;background:#F3EFE8;border-top:1px solid #E6E0D6">
        <p class="mono" style="font-size:12.5px;color:#5A7089">Verified · skillseal.tech</p>
      </div>
    </div>
  </div>

  <!-- measures -->
  <div>
    <div class="rule"></div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;padding-top:20px">
      <div style="display:flex;gap:52px">
        <div><p class="mono" style="font-size:34px;line-height:1">20</p><p style="font-size:15px;color:#5A7089;margin-top:8px">Questions</p></div>
        <div><p class="mono" style="font-size:34px;line-height:1">4</p><p style="font-size:15px;color:#5A7089;margin-top:8px">Tiers</p></div>
        <div><p class="mono" style="font-size:34px;line-height:1">3</p><p style="font-size:15px;color:#5A7089;margin-top:8px">Strikes</p></div>
        <div><p class="mono" style="font-size:34px;line-height:1">100%</p><p style="font-size:15px;color:#5A7089;margin-top:8px">Verifiable</p></div>
      </div>
      <span class="mono" style="font-size:19px;font-weight:500;color:#8A1F2F">skillseal.tech</span>
    </div>
  </div>

</div></body></html>"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    pg.set_content(HTML)
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(OUT / 'og-image.png'))
    pg.screenshot(path=str(OUT / 'og-image.jpg'), type='jpeg', quality=92)
    b.close()

for n in ('og-image.png', 'og-image.jpg'):
    print(f'  {n}: {(OUT/n).stat().st_size//1024} KB')
