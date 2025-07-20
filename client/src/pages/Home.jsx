import axios from "axios";
import { useEffect, useState } from "react"
import { dateFormat, port } from "../../config";

function Home(){
  const [tripList, setTripList] = useState([]);
  const [tripTitle, setTriptitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [addForm, setAddForm] = useState(false);

  useEffect(()=>{
    axios.get(port, {withCredentials:true}).then((response)=>{
      if(response.data.trips)
        setTripList(response.data.trips);
    })
  },[])

  function handleSave(e){
    e.preventDefault();
    axios.post(port + '/add_trip',{title:tripTitle, startDate:startDate, endDate:endDate}, {withCredentials:true}).then((response)=>{
      if(response.status === 201){
        console.log(response.data)
        setTriptitle("");
        setStartDate("");
        setEndDate("");
        setAddForm(false);
        setTripList((prev)=>
          [...prev, response.data.result]
        );
        console.log(tripList)
      }
      else{
        alert(response.data.message);
      }
    }).catch((error)=>{
      alert(error);
    })
    
  }
  return (
    <>
      {addForm ? (<form>
        <p>Add Trip</p>
        <input onChange={(e)=>setTriptitle(e.target.value)} value={tripTitle} placeholder="Title"/>
        <input onChange={(e)=>setStartDate(e.target.value)} value={startDate} placeholder="Start Date"/>
        <input onChange={(e)=>setEndDate(e.target.value)} value={endDate} placeholder="End Date"/>
        <button onClick={handleSave}>Save</button>
        <button onClick={()=>setAddForm(false)}>Cancel</button>

      </form>):(<button onClick={()=>setAddForm(true)}>Add Trip</button>)}
      <ul>
        {tripList.map((trip)=>(<li key={trip.id}><a href={`/trips/${trip.id}`}>{trip.title} from {new Date(trip.start_date).toLocaleString(undefined,dateFormat)} to {new Date(trip.end_date).toLocaleString(undefined,dateFormat)}</a></li>))}
      </ul>
    </>
  )
}
export default Home;