module.exports = {
  defaultConfig: {
    fileMatch: ['^dependencies\\.json$'], // Match the dependencies file
  },
  versioning: 'semver',
  extractPackageFile(content) {
    const deps = [];
    const parsedContent = JSON.parse(content);
    // Loop through each key in the parsedContent object
    Object.keys(parsedContent).forEach(depName => {
      const dep = parsedContent[depName];
      if (dep.version) {
        deps.push({
          depName: depName, // Use the key as the depName
          currentValue: dep.version,
          datasource: 'github-releases',
          lookupName: dep.repo, // This is important for github-releases datasource
          versioning: 'semver',
        });
      }
    });
    return { deps };
  },
  updateDependency({ fileContent, upgrade }) {
    const parsedContent = JSON.parse(fileContent);
    // Find the dependency to update based on depName and update its version
    if (parsedContent[upgrade.depName] && parsedContent[upgrade.depName].version) {
      parsedContent[upgrade.depName].version = upgrade.newValue;
      return JSON.stringify(parsedContent, null, 2); // Return the updated file content
    }
    return fileContent; // Return original content if no update is made
  },
};
