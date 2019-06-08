cd src
python -m SimpleHTTPServer 8080 &
sleep .2
cd ..
google-chrome http://localhost:8080/index.html
