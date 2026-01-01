import yaml from 'js-yaml';

export function parseDsl(dslString: string): any {
  try {
    return yaml.load(dslString);
  } catch (e) {
    console.error("Erreur lors de l'analyse du DSL :", e);
    throw new Error("Format DSL invalide");
  }
}

export function serializeDsl(dslObject: any): string {
  try {
    return yaml.dump(dslObject);
  } catch (e) {
    console.error("Erreur lors de la sérialisation du DSL :", e);
    throw new Error("Impossible de sérialiser le DSL");
  }
}
