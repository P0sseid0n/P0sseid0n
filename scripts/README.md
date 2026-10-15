# SVGs do README

O README do perfil usa SVGs com o mesmo visual do [p0sseid0n.dev](https://p0sseid0n.dev): cores, fontes (Space Grotesk e JetBrains Mono, convertidas em path) e ícones (Simple Icons e Material Symbols). Cada imagem tem uma versão `-dark` e uma `-light`, escolhidas pelo tema do GitHub com `<picture>`.

```sh
cd scripts
npm ci
npm run generate   # escreve os arquivos em ../assets/
```

Os textos (sobre mim, tecnologias, cargos que alternam no topo) ficam em `generate.mjs`. O workflow `.github/workflows/readme-assets.yml` roda o script todo dia, para a idade e o tempo de experiência continuarem certos, e também a cada push que mude `scripts/`.
