import yaml

f = open("/Users/nakamurasatoru/git/d_shibusawa/lab1/src/settings.yml", "r+")
settings = yaml.load(f, Loader=yaml.SafeLoader)
