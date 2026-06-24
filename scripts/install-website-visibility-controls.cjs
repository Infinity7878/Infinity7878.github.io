#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const files = {
  storage: path.join(root, 'src', 'storage.js'),
  commands: path.join(root, 'src', 'commands.js'),
  index: path.join(root, 'src', 'index.js'),
  exporter: path.join(root, 'export-shop-reputation-data.cjs')
};

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const backupRoot = fs.existsSync('/root')
  ? path.join('/root/storebot-backups', `website-visibility-${stamp()}`)
  : path.join(root, `.backup-website-visibility-${stamp()}`);

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text);
}

function backup(file) {
  const rel = path.relative(root, file);
  const dest = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}

function replaceOnce(text, oldText, newText, label) {
  if (text.includes(newText)) return { text, changed: false, skipped: true };
  if (!text.includes(oldText)) {
    throw new Error(`Could not find insertion point for ${label}.`);
  }
  return { text: text.replace(oldText, newText), changed: true, skipped: false };
}

function patchFile(name, patcher) {
  const file = files[name];
  backup(file);
  const before = read(file);
  const after = patcher(before);
  if (after !== before) {
    write(file, after);
    console.log(`Patched ${path.relative(root, file)}`);
  } else {
    console.log(`No changes needed for ${path.relative(root, file)}`);
  }
}

fs.mkdirSync(backupRoot, { recursive: true });

patchFile('storage', (s) => {
  const oldText = `      botNickname: "",\n      storePanelChannelId: "",`;
  const newText = `      botNickname: "",\n      publicPagesEnabled: true,\n      hideFromPublicDirectory: false,\n      storePanelChannelId: "",`;
  return replaceOnce(s, oldText, newText, 'storage public website defaults').text;
});

patchFile('commands', (s) => {
  const oldText = `        .addChannelOption((option) => option.setName("logs_channel").setDescription("Private/staff channel for order and AutoPay logs.").setRequired(false))\n        .addRoleOption((option) => option.setName("staff_role").setDescription("Role allowed to manage products/orders/settings.").setRequired(false))\n    )\n    .addSubcommand((sub) => sub.setName("settings").setDescription("Show this server's Store Bot settings."))`;
  const newText = `        .addChannelOption((option) => option.setName("logs_channel").setDescription("Private/staff channel for order and AutoPay logs.").setRequired(false))\n        .addRoleOption((option) => option.setName("staff_role").setDescription("Role allowed to manage products/orders/settings.").setRequired(false))\n        .addBooleanOption((option) => option.setName("website_visible").setDescription("Show this store on storebot.pro shop/reputation pages. Default true.").setRequired(false))\n    )\n    .addSubcommand((sub) =>\n      sub\n        .setName("website")\n        .setDescription("Show or hide this store on storebot.pro shop/reputation pages.")\n        .addBooleanOption((option) => option.setName("visible").setDescription("True = show publicly, false = hide from the website.").setRequired(true))\n    )\n    .addSubcommand((sub) => sub.setName("settings").setDescription("Show this server's Store Bot settings."))`;
  return replaceOnce(s, oldText, newText, 'commands /storebot setup website_visible and /storebot website').text;
});

patchFile('index', (s) => {
  let out = s;

  ({ text: out } = replaceOnce(
    out,
    `          "\`/storebot settings\` — view configured settings",\n          "\`/storebot setlogs\` — set the private/staff logs channel",`,
    `          "\`/storebot settings\` — view configured settings",\n          "\`/storebot website\` — show/hide this store on storebot.pro shop/reputation pages",\n          "\`/storebot setlogs\` — set the private/staff logs channel",`,
    'help command website line'
  ));

  ({ text: out } = replaceOnce(
    out,
    `      { name: "Premium", value: isPremiumStore(store) ? "Active" : "Not active", inline: true },\n      { name: "Store panel channel", value: formatChannelSetting(store.settings?.storePanelChannelId), inline: true },`,
    `      { name: "Premium", value: isPremiumStore(store) ? "Active" : "Not active", inline: true },\n      { name: "Website listing", value: store.settings?.publicPagesEnabled === false || store.settings?.hideFromPublicDirectory === true ? "Hidden from storebot.pro" : "Visible on storebot.pro", inline: true },\n      { name: "Store panel channel", value: formatChannelSetting(store.settings?.storePanelChannelId), inline: true },`,
    'settings embed website field'
  ));

  ({ text: out } = replaceOnce(
    out,
    `  if (sub === "help") return interaction.reply({ embeds: [buildHelpEmbed(store, isOwner(interaction))], flags: MessageFlags.Ephemeral });\n  if (sub === "guide") return interaction.reply({ embeds: [buildBeginnerGuideEmbed(store)], flags: MessageFlags.Ephemeral });\n  if (sub === "settings") return interaction.reply({ embeds: [buildSettingsEmbed(store)], flags: MessageFlags.Ephemeral });\n  if (sub === "reviews") {`,
    `  if (sub === "help") return interaction.reply({ embeds: [buildHelpEmbed(store, isOwner(interaction))], flags: MessageFlags.Ephemeral });\n  if (sub === "guide") return interaction.reply({ embeds: [buildBeginnerGuideEmbed(store)], flags: MessageFlags.Ephemeral });\n  if (sub === "settings") return interaction.reply({ embeds: [buildSettingsEmbed(store)], flags: MessageFlags.Ephemeral });\n  if (sub === "website") {\n    if (!hasManageServer(interaction)) return interaction.reply({ content: manageServerRequiredText(), flags: MessageFlags.Ephemeral });\n    const visible = interaction.options.getBoolean("visible", true);\n    updateGuildStore(interaction.guildId, (s) => {\n      s.settings.publicPagesEnabled = visible;\n      s.settings.hideFromPublicDirectory = !visible;\n      s.settings.websiteVisibilityUpdatedAt = new Date().toISOString();\n      s.settings.websiteVisibilityUpdatedBy = interaction.user.id;\n    }, interaction.guild.name);\n    const updated = getGuildStore(interaction.guildId, interaction.guild.name);\n    await sendServerLog(interaction.guild, updated, visible ? "Website Shop Listing Enabled" : "Website Shop Listing Hidden", visible ? 0x2ecc71 : 0xe67e22, [\n      { name: "Changed by", value: \`${'${interaction.user.tag}'} (${'${interaction.user.id}'})\`, inline: false },\n      { name: "Website listing", value: visible ? "Visible on storebot.pro shop/reputation pages" : "Hidden from storebot.pro shop/reputation pages", inline: false }\n    ]);\n    return interaction.reply({\n      content: visible\n        ? "This store will be shown on storebot.pro after the next website export runs."\n        : "This store will be hidden from storebot.pro after the next website export runs. Discord store panels and orders still work normally.",\n      flags: MessageFlags.Ephemeral\n    });\n  }\n  if (sub === "reviews") {`,
    'handle /storebot website'
  ));

  ({ text: out } = replaceOnce(
    out,
    `    const broadcastChannel = interaction.options.getChannel("broadcast_channel", false);\n    const logsChannel = interaction.options.getChannel("logs_channel", false);\n    const staffRole = interaction.options.getRole("staff_role", false);`,
    `    const broadcastChannel = interaction.options.getChannel("broadcast_channel", false);\n    const logsChannel = interaction.options.getChannel("logs_channel", false);\n    const staffRole = interaction.options.getRole("staff_role", false);\n    const websiteVisible = interaction.options.getBoolean("website_visible", false);`,
    'storebot setup website_visible option read'
  ));

  ({ text: out } = replaceOnce(
    out,
    `      if (support != null) s.settings.supportLink = cleanedSupport;\n      if (broadcastChannel) s.settings.broadcastChannelId = broadcastChannel.id;`,
    `      if (support != null) s.settings.supportLink = cleanedSupport;\n      if (websiteVisible !== null) {\n        s.settings.publicPagesEnabled = websiteVisible;\n        s.settings.hideFromPublicDirectory = !websiteVisible;\n        s.settings.websiteVisibilityUpdatedAt = new Date().toISOString();\n        s.settings.websiteVisibilityUpdatedBy = interaction.user.id;\n      }\n      if (broadcastChannel) s.settings.broadcastChannelId = broadcastChannel.id;`,
    'storebot setup website visibility save'
  ));

  ({ text: out } = replaceOnce(
    out,
    `      broadcastChannel ? { name: "Broadcast channel", value: \`<#${'${broadcastChannel.id}'}>\`, inline: true } : null,\n      logsChannel ? { name: "Logs channel", value: \`<#${'${logsChannel.id}'}>\`, inline: true } : null,`,
    `      broadcastChannel ? { name: "Broadcast channel", value: \`<#${'${broadcastChannel.id}'}>\`, inline: true } : null,\n      logsChannel ? { name: "Logs channel", value: \`<#${'${logsChannel.id}'}>\`, inline: true } : null,\n      websiteVisible !== null ? { name: "Website listing", value: websiteVisible ? "Visible on storebot.pro" : "Hidden from storebot.pro", inline: true } : null,`,
    'storebot setup log website visibility field'
  ));

  ({ text: out } = replaceOnce(
    out,
    `    if (staffRole) parts.push(\`<@&${'${staffRole.id}'}> can now manage Store Bot products, orders, AutoPay, discounts, and gift cards.\`);`,
    `    if (staffRole) parts.push(\`<@&${'${staffRole.id}'}> can now manage Store Bot products, orders, AutoPay, discounts, and gift cards.\`);\n    if (websiteVisible !== null) parts.push(websiteVisible ? "Website listing is visible on storebot.pro after the next export." : "Website listing is hidden from storebot.pro after the next export.");`,
    'storebot setup response website visibility line'
  ));

  return out;
});

patchFile('exporter', (s) => {
  const oldText = `  if (PUBLIC_ONLY && settings.publicPagesEnabled !== true && store.publicPagesEnabled !== true) return false;\n  if (settings.publicPagesEnabled === false || store.publicPagesEnabled === false) return false;\n  if (settings.hideFromPublicDirectory === true || store.hideFromPublicDirectory === true) return false;`;
  const newText = `  if (PUBLIC_ONLY && settings.publicPagesEnabled !== true && store.publicPagesEnabled !== true) return false;\n  if (settings.publicPagesEnabled === false || store.publicPagesEnabled === false) return false;\n  if (settings.websitePublic === false || settings.shopPublic === false || settings.publicWebsiteEnabled === false) return false;\n  if (settings.hideFromPublicDirectory === true || settings.hideFromWebsite === true || settings.hiddenFromWebsite === true || store.hideFromPublicDirectory === true) return false;`;
  return replaceOnce(s, oldText, newText, 'exporter hidden/public aliases').text;
});

console.log(`Backups written to ${backupRoot}`);
console.log('Next: run node --check on src/storage.js, src/commands.js, src/index.js, and export-shop-reputation-data.cjs, then npm run deploy and restart the bot.');
