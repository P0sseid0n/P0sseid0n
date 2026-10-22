# SVGs do README

O README do perfil usa SVGs com o mesmo visual do [p0sseid0n.dev](https://p0sseid0n.dev): cores, fontes (Space Grotesk e JetBrains Mono, convertidas em path) e ícones (Simple Icons e Material Symbols). Cada imagem tem uma versão `-dark` e uma `-light`, escolhidas pelo tema do GitHub com `<picture>`.

```sh
cd scripts
npm ci
npm run generate   # escreve os arquivos em ../assets/
```

Os textos (tecnologias, cargos que alternam no topo) ficam em `generate.mjs`. Cada SVG passa pelo [svgo](https://github.com/svg/svgo) antes de ser salvo; a configuração (`SVGO_CONFIG`) deixa o CSS e os grupos intactos para não quebrar as animações.

Os cards de estatísticas e linguagens (`github-*.svg`) usam a API GraphQL do GitHub e precisam de `GITHUB_TOKEN`; sem ele, os cards existentes são mantidos. O workflow `.github/workflows/readme-assets.yml` roda o script todo dia e a cada push que mude `scripts/`.
