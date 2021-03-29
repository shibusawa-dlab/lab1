import yaml

f = open("settings.yml", "r+")
settings = yaml.load(f, Loader=yaml.SafeLoader)
