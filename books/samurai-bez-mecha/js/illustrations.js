/* Минималистичные авторские иллюстрации (inline SVG).
   Линии рисуются currentColor, акценты — var(--accent). */
(function () {
  var A = 'var(--accent)', G = 'var(--gold)';
  function svg(body, vb) {
    return '<svg viewBox="' + (vb || '0 0 200 140') + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }
  var sun = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + A + '" stroke="none" opacity=".9"/>'; };

  window.ART = {
    // Обложка: самурай без меча на фоне солнца
    cover: svg(
      sun(130, 62, 44) +
      '<path d="M10 128 Q60 112 100 120 T190 116" opacity=".5"/>' +
      '<path d="M20 136 H180" opacity=".3"/>' +
      // фигура
      '<circle cx="92" cy="40" r="9"/>' +
      '<path d="M80 34 L104 34" />' +
      '<path d="M92 49 L92 54"/>' +
      '<path d="M70 58 Q92 50 114 58 L108 92 H76 Z" fill="var(--bg)"/>' +
      '<path d="M76 92 L68 122 H116 L108 92"/>' +
      '<path d="M92 92 V122"/>' +
      '<path d="M76 66 Q70 80 84 82"/><path d="M108 66 Q114 80 100 82"/>' +
      '<path d="M84 82 Q92 86 100 82"/>' +
      // свиток вместо меча
      '<rect x="100" y="76" width="22" height="6" rx="3" fill="' + G + '" stroke="none"/>',
      '0 0 200 140'),

    village: svg(
      sun(160, 34, 14) +
      '<path d="M20 70 L50 46 L80 70 Z"/><path d="M28 70 V100 H72 V70"/><path d="M45 100 V84 H56 V100"/>' +
      '<path d="M10 110 H190" /><path d="M10 120 L40 118 M60 122 L100 119 M120 123 L180 120" opacity=".5"/>' +
      '<path d="M100 100 v-10 M108 100 v-14 M116 100 v-10 M124 100 v-14 M132 100 v-10 M140 100 v-14" stroke="' + G + '"/>'),

    sandals: svg(
      '<path d="M40 60 Q36 30 60 28 Q84 30 80 60 L78 110 Q60 120 42 110 Z"/>' +
      '<path d="M44 74 L60 56 L76 74"/>' +
      '<path d="M120 60 Q116 30 140 28 Q164 30 160 60 L158 110 Q140 120 122 110 Z"/>' +
      '<path d="M124 74 L140 56 L156 74"/>' +
      '<path d="M90 30 q6 -10 0 -18 M100 34 q6 -10 0 -18 M110 30 q6 -10 0 -18" stroke="' + A + '"/>'),

    wall: svg(
      '<path d="M20 110 H180"/>' +
      '<path d="M30 110 V70 H170 V110"/><path d="M30 90 H170 M70 70 V90 M110 70 V90 M150 70 V90 M50 90 V110 M90 90 V110 M130 90 V110"/>' +
      '<path d="M30 70 V58 H44 V70 M64 70 V58 H78 V70 M98 70 V58 H112 V70 M132 70 V58 H146 V70 M156 70 V58 H170 V70"/>' +
      '<circle cx="46" cy="38" r="6" fill="' + A + '" stroke="none"/><circle cx="100" cy="34" r="6" fill="' + A + '" stroke="none"/><circle cx="154" cy="38" r="6" fill="' + A + '" stroke="none"/>' +
      '<path d="M46 44 V54 M100 40 V54 M154 44 V54"/>'),

    firewood: svg(
      '<path d="M50 112 H150"/>' +
      '<path d="M60 112 L140 96 M60 96 L140 112" stroke-width="5" opacity=".6"/>' +
      '<path d="M100 96 Q80 74 96 56 Q98 70 108 72 Q116 60 110 44 Q132 66 116 96 Z" fill="' + A + '" stroke="none" opacity=".85"/>' +
      '<path d="M30 40 h20 M30 50 h14 M150 40 h20 M156 50 h14" opacity=".4"/>'),

    river: svg(
      '<path d="M0 100 Q50 88 100 100 T200 98" stroke="' + A + '" opacity=".6"/>' +
      '<path d="M0 116 Q50 104 100 116 T200 114" stroke="' + A + '" opacity=".35"/>' +
      '<path d="M70 84 H130 V62 H70 Z"/><path d="M64 62 L100 44 L136 62"/><path d="M84 52 L100 30 L116 52"/><path d="M90 84 V70 H110 V84"/>' +
      '<path d="M20 30 l4 4 l4 -4 M160 22 l4 4 l4 -4" opacity=".5"/>' +
      '<circle cx="170" cy="40" r="8" stroke="' + G + '"/>'),

    castle: svg(
      '<path d="M40 124 H160"/><path d="M50 124 L60 100 H140 L150 124"/>' +
      '<path d="M66 100 V84 H134 V100"/><path d="M58 84 L100 66 L142 84"/>' +
      '<path d="M76 66 V54 H124 V66"/><path d="M68 54 L100 38 L132 54"/>' +
      '<path d="M86 38 V30 H114 V38"/><path d="M80 30 L100 18 L120 30"/>' +
      '<path d="M92 124 V108 H108 V124"/>' +
      '<path d="M100 18 V10" stroke="' + G + '"/>' + sun(170, 30, 10)),

    flood: svg(
      '<path d="M76 70 H124 V52 H76 Z"/><path d="M70 52 L100 36 L130 52"/>' +
      '<path d="M0 84 Q25 76 50 84 T100 84 T150 84 T200 84" stroke="' + A + '"/>' +
      '<path d="M0 98 Q25 90 50 98 T100 98 T150 98 T200 98" stroke="' + A + '" opacity=".6"/>' +
      '<path d="M0 112 Q25 104 50 112 T100 112 T150 112 T200 112" stroke="' + A + '" opacity=".35"/>' +
      '<path d="M10 70 L40 56 L40 84 M160 84 L160 56 L190 70" opacity=".5"/>'),

    fire: svg(
      '<path d="M60 120 V80 H140 V120"/><path d="M50 80 L100 56 L150 80"/>' +
      '<path d="M78 80 Q60 50 82 30 Q84 48 96 48 Q100 30 92 12 Q130 40 112 80" fill="' + A + '" stroke="none" opacity=".85"/>' +
      '<path d="M120 80 Q130 64 124 50 Q144 66 136 80" fill="' + G + '" stroke="none" opacity=".8"/>' +
      '<path d="M40 120 H160"/>'),

    march: svg(
      '<path d="M10 120 Q60 70 110 90 T190 40" stroke-dasharray="6 6"/>' +
      '<path d="M20 112 l6 -14 l6 14 M60 92 l6 -14 l6 14 M110 88 l6 -14 l6 14 M160 58 l6 -14 l6 14" stroke="' + A + '"/>' +
      '<path d="M26 98 v-10 h10 M66 78 v-10 h10 M116 74 v-10 h10 M166 44 v-10 h10" stroke="' + A + '"/>' +
      '<circle cx="186" cy="36" r="6" fill="' + A + '" stroke="none"/>'),

    battle: svg(
      '<path d="M40 120 L150 30" stroke-width="3"/><path d="M160 120 L50 30" stroke-width="3"/>' +
      '<path d="M140 38 L150 30 L146 44 M60 38 L50 30 L54 44"/>' +
      sun(100, 74, 10) + '<path d="M10 128 H190" opacity=".4"/>'),

    tea: svg(
      '<path d="M50 70 H150 Q146 116 100 118 Q54 116 50 70 Z"/>' +
      '<path d="M64 70 Q100 82 136 70" stroke="' + A + '"/>' +
      '<path d="M84 52 q8 -12 0 -24 M104 56 q8 -12 0 -24 M124 52 q8 -12 0 -24" opacity=".5"/>' +
      '<path d="M70 124 H130"/>'),

    handshake: svg(
      '<path d="M20 80 L60 60 L90 68 L120 58 L180 80"/>' +
      '<path d="M60 60 L84 88 Q92 96 100 88 L120 70"/><path d="M90 68 L110 92 Q116 98 122 92"/>' +
      '<path d="M20 80 V100 M180 80 V100"/>' + sun(100, 32, 10)),

    mountain: svg(
      sun(140, 46, 18) +
      '<path d="M10 120 L70 40 L100 80 L130 56 L190 120 Z" fill="var(--bg)"/>' +
      '<path d="M58 56 L70 40 L82 56 L74 52 L66 58 Z" fill="currentColor" stroke="none" opacity=".25"/>' +
      '<path d="M40 100 l10 -10 l10 10" opacity=".4"/>'),

    ear: svg(
      '<path d="M80 30 Q130 20 132 64 Q132 84 114 96 Q104 104 104 118 Q104 128 92 128"/>' +
      '<path d="M96 54 Q110 50 112 64 Q112 76 100 80"/>' +
      '<path d="M146 50 q10 14 0 28 M158 40 q16 24 0 48" stroke="' + A + '"/>'),

    people: svg(
      '<circle cx="60" cy="50" r="10"/><path d="M42 100 Q42 68 60 68 Q78 68 78 100"/>' +
      '<circle cx="100" cy="42" r="12" stroke="' + A + '"/><path d="M78 104 Q78 64 100 64 Q122 64 122 104" stroke="' + A + '"/>' +
      '<circle cx="140" cy="50" r="10"/><path d="M122 100 Q122 68 140 68 Q158 68 158 100"/>' +
      '<path d="M30 112 H170"/>'),

    scroll: svg(
      '<rect x="40" y="30" width="120" height="80" rx="4"/>' +
      '<path d="M40 30 Q30 30 30 40 V100 Q30 110 40 110 M160 30 Q170 30 170 40 V100 Q170 110 160 110"/>' +
      '<path d="M60 50 H140 M60 64 H140 M60 78 H120 M60 92 H130" opacity=".5"/>' +
      '<circle cx="146" cy="94" r="7" fill="' + A + '" stroke="none"/>'),

    enso: svg(
      '<path d="M140 46 A46 46 0 1 0 146 82" stroke-width="9" stroke="' + A + '" opacity=".9"/>' +
      '<path d="M146 82 l4 6" stroke-width="5" stroke="' + A + '"/>'),

    sword: svg(
      '<path d="M30 110 Q100 90 170 30" stroke-width="3" opacity=".3"/>' +
      '<path d="M30 110 L50 104" stroke-width="6"/>' +
      '<rect x="40" y="70" width="120" height="40" rx="4" stroke="' + A + '"/>' +
      '<path d="M56 84 H144 M56 96 H124" stroke="' + A + '" opacity=".6"/>'),

    rice: svg(
      '<path d="M40 120 H160"/>' +
      '<path d="M60 120 Q58 80 70 50 M100 120 Q98 70 104 34 M140 120 Q140 84 130 54"/>' +
      '<path d="M70 50 q10 -4 12 4 q-10 4 -12 -4 M66 64 q10 -4 12 4 q-10 4 -12 -4 M104 34 q10 -4 12 4 q-10 4 -12 -4 M102 50 q10 -4 12 4 q-10 4 -12 -4 M130 54 q-10 -4 -12 4 q10 4 12 -4 M134 68 q-10 -4 -12 4 q10 4 12 -4" fill="' + G + '" stroke="' + G + '"/>'),

    sea: svg(
      '<path d="M0 96 Q25 86 50 96 T100 96 T150 96 T200 96" stroke="' + A + '" opacity=".7"/>' +
      '<path d="M0 112 Q25 102 50 112 T100 112 T150 112 T200 112" stroke="' + A + '" opacity=".4"/>' +
      '<path d="M70 90 L130 90 L122 102 H78 Z"/><path d="M100 90 V36"/><path d="M100 40 Q130 56 100 80"/>' +
      '<path d="M150 40 h30 M160 50 h20" opacity=".4"/>'),

    lantern: svg(
      '<path d="M100 20 V30"/><path d="M80 30 H120"/>' +
      '<path d="M84 30 Q70 70 84 110 H116 Q130 70 116 30" fill="' + A + '" stroke="' + A + '" fill-opacity=".15"/>' +
      '<path d="M80 110 H120 M100 110 V120"/><path d="M78 50 H122 M76 70 H124 M78 90 H122" opacity=".4"/>')
  };
})();
