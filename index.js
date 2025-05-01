import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const __dirname = path.resolve();

async function scrapeImages() {
  let browser;
  try {
    // Inicia o navegador
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navega até a página de cartas Pokémon
    await page.goto("https://www.pokemon-zone.com/cards/?series=PROMO-A", {
      waitUntil: "domcontentloaded",
    });

    // Coleta os links das cartas
    const cardLinks = await page.evaluate(() => {
      return [...document.querySelectorAll(".card-grid a")].map((a) => a.href);
    });

    // Array para armazenar os dados de todas as cartas
    const allCardsData = [];

    // Itera sobre os links das cartas
    for (const link of cardLinks) {
      const newPage = await browser.newPage();
      await newPage.goto(link, { waitUntil: "domcontentloaded" });

      // Extrai os dados da carta
      const data = await newPage.evaluate(() => {
        const cardNameElement = document.querySelector("h1");
        const cardInfoElement = document.querySelector(
          ".card-detail__content .fw-bold"
        );
        const cardHPElement = document.querySelector(".lh-1");

        let name = cardNameElement ? cardNameElement.textContent.trim() : "";

        let entity = "";
        let stage = "";
        let evolvesFrom = "";
        let type = "";

        if (cardInfoElement) {
          let cardInfoParts =
            cardInfoElement.textContent
              ?.split("|")
              .map((part) => part.trim()) || [];

          entity = cardInfoParts.length > 0 ? cardInfoParts[0] : "";

          if (entity.includes("Pokémon")) {
            stage = cardInfoParts.length > 1 ? cardInfoParts[1] : "";
          } else {
            type = cardInfoParts.length > 1 ? cardInfoParts[1] : "";
          }

          evolvesFrom = cardInfoParts.length > 2 ? cardInfoParts[2] : "";
        }

        let hp = cardHPElement ? cardHPElement.textContent.trim() : "";

        const knownTypes = [
          "grass",
          "fire",
          "water",
          "lightning",
          "psychic",
          "fighting",
          "darkness",
          "metal",
          "dragon",
          "colorless",
          "fairy",
        ];

        const typeElement = document.querySelector(
          "span[class*='energy-icon--type-']"
        );

        if (typeElement) {
          let extractedType = typeElement
            ? typeElement.className.match(/energy-icon--type-([a-z-]+)/)?.[1] ||
              ""
            : "";

          if (entity.includes("Pokémon")) {
            type = knownTypes.includes(extractedType) ? extractedType : "";
          }
        }

        const abilityElement = document.querySelector(".ability-summary-row");
        let ability = [];
        let abilityName = "";
        let abilityDescription = "";

        if (abilityElement) {
          abilityName =
            abilityElement
              .querySelector(".ability-summary-row__name")
              ?.textContent?.trim() || "";
          abilityDescription =
            abilityElement
              .querySelector(".ability-summary-row__description")
              ?.textContent?.trim() || "";

          ability.push({
            name: abilityName,
            description: abilityDescription,
          });
        }

        const attackElements = document.querySelectorAll(".attack-summary-row");
        let attack = [];

        if (attackElements) {
          attackElements.forEach((attackElement) => {
            let attackName =
              attackElement
                .querySelector(".attack-summary-row__name")
                ?.textContent?.trim() || "";
            let attackDamage =
              attackElement
                .querySelector(".attack-summary-row__damage")
                ?.textContent?.trim() || "";
            let attackEffect =
              attackElement
                .querySelector(".attack-summary-row__footer")
                ?.textContent?.trim() || "";

            let energyElements = attackElement.querySelectorAll(
              ".attack-summary-row__costs span[class*='energy-icon--type-']"
            );

            let energyCostsArray = [...energyElements]
              .map(
                (span) =>
                  span.className.match(/energy-icon--type-([a-z-]+)/)?.[1] || ""
              )
              .filter((type) => type !== "");

            // Contando as energias por tipo
            let energyCosts = energyCostsArray.reduce((acc, type) => {
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {});

            attack.push({
              name: attackName,
              energyCosts: [energyCosts], // Array conforme esperado
              damage: attackDamage,
              effect: attackEffect,
            });
          });
        }

        let weakness = [];

        const weaknessDiv = Array.from(document.querySelectorAll("div")).find(
          (div) => div.textContent.trim() === "Weakness"
        );

        if (weaknessDiv) {
          const weaknessElements =
            weaknessDiv.nextElementSibling.querySelectorAll(
              "span[class*='energy-icon--type-']"
            );

          if (weaknessElements) {
            weaknessElements.forEach((weaknessElement) => {
              const weaknessType =
                weaknessElement.className.match(
                  /energy-icon--type-([a-z-]+)/
                )?.[1] || "";

              if (knownTypes.includes(weaknessType)) {
                let weaknessValue = "+20";

                weakness.push({
                  type: weaknessType,
                  value: weaknessValue,
                });
              }
            });
          }
        }

        let retreatCost = 0;

        // Encontra o elemento que contém o texto "Retreat"
        const retreatElement = Array.from(
          document.querySelectorAll(".mb-1")
        ).find((div) => div.textContent?.includes("Retreat"));

        if (retreatElement) {
          // Seleciona apenas os spans de energia dentro do elemento de recuo
          const energyElements = retreatElement.parentElement.querySelectorAll(
            "span[class*='energy-icon--type-colorless']"
          );

          retreatCost = energyElements.length;
        }

        const numberElement = document.querySelector(
          ".card-collection-summary__meta-item"
        );

        let number = numberElement
          ? numberElement.textContent.trim().replace("#", "")
          : "";

        let exRule = "";

        const exElement = document.querySelector(".card-detail__rules");

        exRule = exElement ? exElement.textContent.trim() : "";

        const expansionElement = document.querySelector(
          ".card-collection-summary__name a"
        );

        let expansion = expansionElement
          ? expansionElement.textContent?.trim()
          : "";

        const packElement = document.querySelector(
          ".card-detail__pack__name a"
        );

        let pack = packElement ? packElement.textContent?.trim() : "";

        const imageElement = document.querySelector(".game-card-image__img");

        let imageUrl = imageElement ? imageElement.src : "";

        let action = "";

        if (entity.includes("Trainer")) {
          const actionElement = document.querySelector(".card-detail__desc");
          action = actionElement ? actionElement.textContent.trim() : "";
        }

        return {
          entity,
          name,
          stage,
          evolvesFrom,
          hp,
          type,
          ability,
          attack,
          weakness,
          retreatCost,
          number,
          exRule,
          action,
          expansion,
          pack,
          imageUrl,
        };
      });

      // Adiciona os dados da carta ao array
      allCardsData.push(data);

      // Fecha a página da carta atual
      await newPage.close();

      break;
    }

    // Salva os dados em um arquivo JSON
    const filePath = path.join(__dirname, "cartas_pokemon.json");
    fs.writeFileSync(filePath, JSON.stringify(allCardsData, null, 2));

    console.log(`Dados salvos em ${filePath}`);
  } catch (error) {
    console.error("Ocorreu um erro durante o scraping:", error);
  } finally {
    // Fecha o navegador
    if (browser) {
      await browser.close();
    }
  }
}

// Executa a função
scrapeImages();
