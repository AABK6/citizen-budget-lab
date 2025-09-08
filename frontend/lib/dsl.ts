import yaml from 'js-yaml';

export function parseDsl(dslString: string): any {
  try {
    return yaml.load(dslString);
  } catch (e) {
    console.error("Error parsing DSL:", e);
    throw new Error("Invalid DSL format");
  }
}

export function serializeDsl(dslObject: any): string {
  try {
    return yaml.dump(dslObject);
  } catch (e) {
    console.error("Error serializing DSL:", e);
    throw new Error("Failed to serialize DSL");
  }
}
