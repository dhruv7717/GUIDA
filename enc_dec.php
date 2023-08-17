<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="content-type" content="text/html; charset=ISO-8859-1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
    <link rel = "icon" href ="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXQ8lTatlT7yemAdbAP0IGxCIyGqd0Jq02Jg&usqp=CAU" type = "image/x-icon">
    <title>Encryption && Decryption ✋</title>

    <style type="text/css">

        ::selection { background-color: #E13300; color: white; }
        ::-moz-selection { background-color: #E13300; color: white; }

        body {
            /* background-color: #fff; */
            margin: 60px;
            font: 13px/20px normal Helvetica, Arial, sans-serif;
            color: #4F5155;
            /* border: solid 1px; */
             /* background-image: url("https://www.shutterstock.com/image-illustration/abstract-blue-red-smoke-steam-260nw-1468643051.jpg"); */
            background-repeat: repeat-x;
            /* background-color: lightgrey  */
            border: thick double lightblue;
            /* border-style: inset; */
            /* border-style: ridge; */
        }

        a {
            color: #003399;
            background-color: transparent;
            font-weight: normal;
        }

        h1 {
            color: #444;
            background-color: transparent;
            border-bottom: 1px solid #D0D0D0;
            font-size: 19px;
            font-weight: normal;
            margin: 0 0 14px 0;
            padding: 14px 15px 10px 15px;
        }
        /* button css start */
      
                .cursor{
                    width: 160px;
                    height: 40px;
                    /* border: none; */
                    outline: none;
                    color: #fff;
                    background: #111;
                    /* cursor: pointer; */
                    position: relative;
                    z-index: 0;
                    border-radius: 10px;
                    /* border-radius: 10% 30% 50% 70%; */
                    margin:20px
                }

                .cursor:before {
                    content: '';
                    background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
                    position: absolute;
                    top: -2px;
                    left:-2px;
                    background-size: 400%;
                    z-index: -1;
                    filter: blur(5px);
                    width: calc(100% + 4px);
                    height: calc(100% + 4px);
                    animation: glowing 20s linear infinite;
                    opacity: 0;
                    transition: opacity .3s ease-in-out;
                    border-radius: 10px;
                }

                .cursor:active {
                    color: #000
                }

                .cursor:active:after {
                    background: transparent;
                }

                .cursor:hover:before {
                    opacity: 1;
                }

                .cursor:after {
                    z-index: -1;
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: #111;
                    left: 0;
                    top: 0;
                    border-radius: 10px;
                }

                @keyframes glowing {
                    0% { background-position: 0 0; }
                    50% { background-position: 400% 0; }
                    100% { background-position: 0 0; }
                }

                /*  */
                 .orignal{
                    width: 150px;
                    height: 35px;
                    /* border: none; */
                    /* outline: none; */
                    color: #fff;
                    background: #111;
                    /* cursor: pointer; */
                    position: relative;
                    z-index: 0;
                    border-radius: 10px;
                    margin:20px;
                    /* cursor: copy; */
                }

                .orignal:before {
                    content: '';
                    background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
                    position: absolute;
                    top: -2px;
                    left:-2px;
                    background-size: 400%;
                    z-index: -1;
                    filter: blur(5px);
                    width: calc(100% + 4px);
                    height: calc(100% + 4px);
                    animation: glowing 20s linear infinite;
                    opacity: 0;
                    transition: opacity .3s ease-in-out;
                    border-radius: 10px;
                }

                .orignal:active {
                    color: #000
                }

                .orignal:active:after {
                    background: transparent;
                }

                .orignal:hover:before {
                    opacity: 1;
                }

                .orignal:after {
                    z-index: -1;
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: #111;
                    left: 0;
                    top: 0;
                    border-radius: 10px;
                    
                }

                @keyframes glowing {
                    0% { background-position: 0 0; }
                    50% { background-position: 400% 0; }
                    100% { background-position: 0 0; }
                }
                /*  */
                .middle{
                    background-color: #f0f1f2;
                    /* font-style: oblique; */
                    font-size: 1.5em;
                
                }
                .enc  {
                    background-color:black;
                    color:white;
                    font-size: 20px;
                    /* border-radius:5px; */
                    /* border-radius: 10px 100px / 120px; */
                    border-radius: 10% 30% 50% 70%;
                    box-shadow: 0px 0px 2px 2px rgb(0,0,0);
                    height:40px;
                    width:120px;

                }
                .enc:active {
                    background-color: #CFECEC;
                }
                h2{
                    font-style: oblique;
                }
                #p1,#p2{
                     font-size: 15px;
                     color : #232b2b;
                     word-wrap: break-word;
                     /* color :green;   */
                     
                }
                pre{
                    font-size: 15px;
                    font-weight: bold;
                    color: #000036; 
                    
                }

                /* ------------------------------------- */

              /* ========================================================== */
                
        /* button cs end */
        code {
            font-family: Consolas, Monaco, Courier New, Courier, monospace;
            font-size: 12px;
            background-color: #f9f9f9;
            border: 1px solid #D0D0D0;
            color: #002166;
            display: block;
            margin: 14px 0 14px 0;
            padding: 12px 10px 12px 10px;
        }

        #body {
            margin: 0 20px 0 20px;
             /* background-image: url("https://stock.adobe.com/in/search?k=gif+background&asset_id=326470900"); */
        }

        p.footer {
            text-align: right;
            font-size: 11px;
            border-top: 1px solid #D0D0D0;
            line-height: 32px;
            padding: 0 10px 0 10px;
            margin: 20px 0 0 0;
        }
        .h1hading{
            color: #000000;

        }

        #container {
            margin: 10px;
            border: 1px solid #D0D0D0;
            box-shadow: 0 0 8px #D0D0D0;
        }


        
    </style>
</head>
<body>

    <!--  -->
    <h1 class='h1hading'><b>Encryption & Decryption NodeJS</b>&nbsp;&nbsp;&nbsp;
</h1>


<div id="body">
    <form class='form-horizontal' role='form' id = 'poster_add' name= 'poster_add' enctype='multipart/form-data' action="enc_dec.php" method="POST">
        <!-- <label><h2>Text or Encryption </h2></label><br> -->
        <textarea name="data" id="data" class= "middle" required="" cols="100" rows="10" ></textarea>
        <br><br>
        <input type="submit" name="type" class = "enc text-capitalize" value="encrypt" style='cursor:cell'>&nbsp;&nbsp;&nbsp;
        <input type="submit" name="type" class = "enc text-capitalize" value="decrypt"  style='cursor:cell'> &nbsp;&nbsp;&nbsp;
        <input type="reset" name="reset" class = "enc text-capitalize" value="clear"  style='cursor:cell'>&nbsp;&nbsp;&nbsp;
        <input type="button" class="enc text-capitalize" value="paste" id="pastebtn" onclick="pasteFromClipboard()" style="cursor: cell">
             
            <br><br>
        </form>
    </div>
</div>


<!-- Code injected by live-server -->

<script>
	// <![CDATA[  <-- For SVG support
	if ('WebSocket' in window) {
		(function () {
			function refreshCSS() {
				var sheets = [].slice.call(document.getElementsByTagName("link"));
				var head = document.getElementsByTagName("head")[0];
				for (var i = 0; i < sheets.length; ++i) {
					var elem = sheets[i];
					var parent = elem.parentElement || head;
					parent.removeChild(elem);
					var rel = elem.rel;
					if (elem.href && typeof rel != "string" || rel.length == 0 || rel.toLowerCase() == "stylesheet") {
						var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '');
						elem.href = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_cacheOverride=' + (new Date().valueOf());
					}
					parent.appendChild(elem);
				}
			}
			var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
			var address = protocol + window.location.host + window.location.pathname + '/ws';
			var socket = new WebSocket(address);
			socket.onmessage = function (msg) {
				if (msg.data == 'reload') window.location.reload();
				else if (msg.data == 'refreshcss') refreshCSS();
			};
			if (sessionStorage && !sessionStorage.getItem('IsThisFirstTime_Log_From_LiveServer')) {
				console.log('Live reload enabled.');
				sessionStorage.setItem('IsThisFirstTime_Log_From_LiveServer', true);
			}
		})();
	}
	else {
		console.error('Upgrade your browser. This Browser is NOT supported WebSocket for Live-Reloading.');
	}



	// ]]>

    // 0------------------------------------------------

    // ======================================================
   
</script>

</body>
<script type="text/javascript">
    function CopyToClipboard(containerid) {
        var container = document.getElementById(containerid);
        if (!container) return;

        container.style.display = "block";
        var range = document.createRange();
        range.selectNode(container);
        window.getSelection().addRange(range);

        navigator.clipboard.writeText(container.innerText).then(function() {
            window.getSelection().removeAllRanges();
            var successMessage = document.createElement("div");
            successMessage.innerHTML = "Copied Successfully!";
            successMessage.style.backgroundColor = "lightgreen";
            successMessage.style.color = "black";
            successMessage.style.padding = "10px";
            successMessage.style.position = "fixed";
            successMessage.style.top = "40%";
            successMessage.style.left = "50%";
            successMessage.style.transform = "translate(-50%, -50%)";
            document.body.appendChild(successMessage);
            setTimeout(function() {
                successMessage.remove();
            }, 2500);
        }, function(err) {
            console.error('Failed to copy text: ', err);
        });
    }

    function pasteFromClipboard() {
      navigator.clipboard.readText().then(function (text) {
    document.getElementById("data").value = text;
  });
}
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz" crossorigin="anonymous"></script>
</html>

<?php

$encryptionMethod = 'AES-256-CBC';
$secret = hash('sha256', 'WU3PRArza1H35aOrmXHkm3uFQtzC42jj');
$iv = 'WU3PRArza1H35aOr';   
if (isset($_REQUEST['type']) && isset($_REQUEST['data']) && $_REQUEST['data'] != '') {
    if ($_REQUEST['type'] == 'encrypt') {
        $plaintext = trim($_REQUEST['data']);
        $decrypt_value = $_REQUEST['data'];
        $encrypt_value = openssl_encrypt($plaintext, $encryptionMethod, $secret, 0, $iv);
        echo "<div id='container'><div id='body'><button class='cursor' onclick=CopyToClipboard('p1') style='cursor: wait;'><b>COPY HASH</b></button>
        <p id='p1'>".$encrypt_value."</p><button class='orignal' onclick=CopyToClipboard('p2') style='cursor: wait;'><b>COPY ORIGINAL</b></button>
        <p id='p2'>".$decrypt_value."</p></div></div>";
        die();
    } else {
        $enc = $_REQUEST['data'];
        $decrypt_value = openssl_decrypt($enc, $encryptionMethod, $secret, 0, $iv);
        $encrypt_value = $_REQUEST['data'];
        echo "<div id='container'><div id='body'><button class='cursor' onclick=CopyToClipboard('p1') style='cursor: wait;'><b>COPY HASH</b></button>
        <p id='p1'>".$encrypt_value."</p><button class='orignal' onclick=CopyToClipboard('p2') style='cursor: wait;'><b>COPY ORIGINAL</b></button>
        <p id='p2'>".$decrypt_value."</p>";
        echo "<pre>";
        print_r(json_decode($decrypt_value));"</div></div>";
    }
}

?>