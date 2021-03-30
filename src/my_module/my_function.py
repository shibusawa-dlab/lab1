import yaml

f = open("/Users/nakamurasatoru/git/d_shibusawa/lab1-data/src/settings.yml", "r+")
settings = yaml.load(f, Loader=yaml.SafeLoader)
